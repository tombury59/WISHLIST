"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useWishes } from "./hooks/useWishes";
import { useReservations } from "./hooks/useReservations";
import { useProfile } from "./hooks/useProfile";
import { useHistory } from "./hooks/useHistory";
import { useView } from "./hooks/useView";
import { useIsMobile } from "./hooks/useIsMobile";
import { useBiometric } from "./hooks/useBiometric";
import { useOnline } from "./hooks/useOnline";
import { useSection } from "./hooks/useSection";
import { useInstall } from "./hooks/useInstall";
import Gate from "./components/Gate";
import ProfilePicker from "./components/ProfilePicker";
import ProfilePinGate from "./components/ProfilePinGate";
import Sidebar from "./components/Sidebar";
import BottomNav from "./components/BottomNav";
import MemberStrip from "./components/MemberStrip";
import Avatar from "./components/Avatar";
import Icon from "./components/Icon";
import AddForm from "./components/AddForm";
import ViewSwitch from "./components/ViewSwitch";
import RefreshButton from "./components/RefreshButton";
import ViewTransition from "./components/ViewTransition";
import WishCarousel from "./components/WishCarousel";
import SortableWishList from "./components/SortableWishList";
import CommentsPanel from "./components/CommentsPanel";
import GiftsPage from "./components/GiftsPage";
import ActivityPage from "./components/ActivityPage";
import ConfirmModal from "./components/ConfirmModal";
import EditModal from "./components/EditModal";
import OfflineBanner from "./components/OfflineBanner";
import AccountPage from "./components/AccountPage";
import InstallGuide from "./components/InstallGuide";
import InstallNudge from "./components/InstallNudge";
import Tour from "./components/Tour";
import ClovisArt from "./components/ClovisArt";
import ClovisToast from "./components/ClovisToast";
import { isTouchPlatform } from "./lib/install";
import { STORAGE } from "./lib/constants";
import * as profileApi from "./lib/profile-api";
import { updateUserPin } from "./lib/pins-api";
import { setColorOverrides } from "./lib/format";
import { MEMBERS } from "./lib/members";
import * as offline from "./lib/offline-store";

const plural = (n, word) => `${n} ${word}${n > 1 ? "s" : ""}`;

export default function Home() {
  // Le PIN est la source unique de vérité, partagée entre l'auth et les données.
  const [pin, setPin] = useState("");

  const wishesApi = useWishes(pin);
  const { me, setMe, active, setActive, chooseMe } = useProfile();
  const { view, changeView } = useView();
  const isNarrow = useIsMobile();
  const historyApi = useHistory(pin);
  const biometric = useBiometric();
  const online = useOnline();
  const { section, go } = useSection();
  const install = useInstall();

  // Guide d'installation (fenêtre) + bandeau d'invitation masquable.
  const [guideOpen, setGuideOpen] = useState(false);
  const [hintHidden, setHintHidden] = useState(true); // true tant qu'on n'a pas lu le réglage
  useEffect(() => {
    try {
      setHintHidden(localStorage.getItem(STORAGE.installHint) === "1");
    } catch {
      setHintHidden(false);
    }
  }, []);
  function hideHint() {
    setHintHidden(true);
    try {
      localStorage.setItem(STORAGE.installHint, "1");
    } catch {
      /* stockage indisponible : masqué pour cette visite seulement */
    }
  }
  // La bulle « Psssttt » mène au compte, où la carte d'installation clignote.
  const [flashInstall, setFlashInstall] = useState(false);
  function followNudge() {
    hideHint();
    go("account");
    setFlashInstall(true);
    setTimeout(() => setFlashInstall(false), 2600);
  }

  // Visite guidée de la première visite (retenue dans le navigateur).
  const [tourOpen, setTourOpen] = useState(false);
  const [tourSeen, setTourSeen] = useState(true); // true tant qu'on n'a pas lu le réglage
  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(STORAGE.tour) === "1";
    } catch {
      /* stockage indisponible : on montre le tuto */
    }
    setTourSeen(seen);
    if (!seen) setTourOpen(true);
  }, []);
  function closeTour() {
    setTourOpen(false);
    setTourSeen(true);
    try {
      localStorage.setItem(STORAGE.tour, "1");
    } catch {
      /* ignore */
    }
  }

  async function installNow() {
    const ok = await install.promptInstall();
    if (ok) setGuideOpen(false);
  }

  // Profil sélectionné dans le choix des profils, en attente de son code PIN.
  const [pendingProfile, setPendingProfile] = useState(null);

  // Couleurs partagées (choisies dans « Mon compte »).
  const [colors, setColors] = useState({});

  // État transitoire d'UI (remis à zéro à la déconnexion).
  const [openComments, setOpenComments] = useState(null);
  const [confirmData, setConfirmData] = useState(null); // { message, action }
  const [editData, setEditData] = useState(null); // { member, wish }
  const [onlyFree, setOnlyFree] = useState(false); // filtre « encore libres »
  const [giftsTab, setGiftsTab] = useState("give"); // Cadeaux : "give" | "received"
  // Petite bulle de Clovis qui célèbre une action (réservation, cadeau reçu…).
  const [cheer, setCheer] = useState(null);
  const cheerUp = (pose, text) => setCheer({ pose, text, id: Date.now() });

  const auth = useAuth({
    setPin,
    loadWishes: wishesApi.loadWishes,
    onLogout: () => {
      wishesApi.flushReorder();
      historyApi.reset();
      setConfirmData(null);
      setEditData(null);
      setOpenComments(null);
      setPendingProfile(null);
      go("lists");
    },
  });

  // Réservations visibles par `me` (jamais celles de sa propre liste).
  const resa = useReservations(pin, me, auth.authed);

  // Charge les couleurs partagées une fois connecté (et les rend actives via
  // avatarColor dans toute l'appli).
  useEffect(() => {
    if (!auth.authed) return;
    profileApi
      .getColors(pin)
      .then((d) => {
        setColorOverrides(d.colors || {});
        setColors(d.colors || {});
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.authed]);

  // L'activité se charge à l'ouverture de sa rubrique (et pas avant).
  useEffect(() => {
    if (section === "activity" && auth.authed && me) historyApi.load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, auth.authed, me]);

  const toggleComments = (id) =>
    setOpenComments((cur) => (cur === id ? null : id));
  const openCommentsFor = (id) => setOpenComments(id);
  const closeComments = () => setOpenComments(null);

  function askConfirm(message, action) {
    setConfirmData({ message, action });
  }

  // Demandes de suppression / modification -> passent par les popups.
  function requestDeleteWish(member, wish) {
    askConfirm(`Supprimer « ${wish.name} » de ta liste ?`, () =>
      wishesApi.deleteWish(member, wish.id)
    );
  }
  function requestDeleteComment(member, wishId, comment) {
    askConfirm("Supprimer ce commentaire ?", () =>
      wishesApi.deleteComment(member, wishId, comment.id)
    );
  }
  function requestEditWish(member, wish) {
    setEditData({ member, wish });
  }

  // Ouvre la liste d'un membre (depuis n'importe quelle rubrique).
  function openList(member) {
    setActive(member);
    setOpenComments(null);
    setOnlyFree(false);
    go("lists");
    window.scrollTo({ top: 0 });
  }

  // ---------- ÉCRAN DU CODE ----------
  if (!auth.authed) {
    return (
      <Gate
        pin={pin}
        error={auth.error}
        loading={auth.loading}
        onDigit={auth.pushDigit}
        onBackspace={auth.backspace}
        onSubmit={() => auth.tryLogin(pin)}
      />
    );
  }

  // ---------- CODE DU PROFIL (création la 1re fois, sinon vérification) ----------
  if (pendingProfile) {
    return (
      <ProfilePinGate
        familyPin={pin}
        member={pendingProfile}
        onUnlock={(member) => {
          chooseMe(member);
          setPendingProfile(null);
        }}
        onCancel={() => setPendingProfile(null)}
      />
    );
  }

  // ---------- QUI SOMMES-NOUS ? (choix du profil) ----------
  if (!me) {
    return (
      <ProfilePicker
        online={online}
        enrolledMembers={biometric.enrolled}
        onChoose={async (member) => {
          // Profil enrôlé sur cet appareil -> tentative biométrique directe ;
          // sinon (ou en cas d'échec/annulation) -> écran du code.
          if (biometric.available && biometric.enrolled.includes(member)) {
            try {
              const m = await biometric.unlock(pin, member);
              chooseMe(m);
              return;
            } catch {
              /* annulé ou échec -> repli sur le code */
            }
          }
          setPendingProfile(member);
        }}
      />
    );
  }

  // ---------- APPLI ----------
  const isMine = active === me;
  const activeResa = isMine ? null : resa.reservations[active] || null;

  // Les souhaits « déjà reçus » ne figurent plus dans la liste (ni la sienne,
  // ni celle vue par les autres) : ils sont rangés dans Cadeaux › Reçus.
  const rawList = wishesApi.wishes[active] || [];
  // Rien encore reçu du serveur ni du cache : premier chargement en cours.
  const listsLoading = Object.keys(wishesApi.wishes).length === 0;
  const activeWishes = rawList.filter((w) => !w.disabled);
  const fullList = activeWishes;
  const receivedHere = rawList.length - activeWishes.length;

  // Rang réel de chaque souhait actif (1 = le plus désiré) : reste juste même
  // quand la liste est filtrée.
  const ranks = {};
  activeWishes.forEach((w, i) => (ranks[w.id] = i + 1));

  // Sur la liste d'un autre : combien sont encore libres (ni réservés ni reçus).
  const freeCount = activeWishes.filter((w) => !activeResa?.[w.id]).length;
  const filtering = !isMine && onlyFree;
  const list = filtering ? activeWishes.filter((w) => !activeResa?.[w.id]) : fullList;

  // Compteurs de la navigation (souhaits actifs par membre).
  const counts = {};
  for (const m of MEMBERS) {
    counts[m] = (wishesApi.wishes[m] || []).filter((w) => !w.disabled).length;
  }

  // « Cadeaux » : mes réservations (à offrir), regroupées par personne, et mes
  // souhaits marqués « déjà reçu ». Construit à partir des données déjà en
  // mémoire (aucune requête).
  const giftGroups = [];
  for (const m of MEMBERS) {
    if (m === me) continue;
    const forMember = resa.reservations[m] || {};
    const items = (wishesApi.wishes[m] || [])
      .filter((w) => forMember[w.id]?.by === me)
      .map((w) => ({ wish: w, at: forMember[w.id].at }));
    if (items.length) giftGroups.push({ member: m, items });
  }
  const giftCount = giftGroups.reduce((n, g) => n + g.items.length, 0);
  const received = (wishesApi.wishes[me] || []).filter((w) => w.disabled);

  // Props communes à chaque souhait (liste ou carrousel).
  const itemProps = {
    member: active,
    me,
    canEdit: isMine,
    ranks,
    onDelete: requestDeleteWish,
    onSetDisabled: (member, wishId, disabled) => {
      wishesApi.setWishDisabled(member, wishId, disabled);
      if (disabled) cheerUp("bond", "Un cadeau reçu, youpi ! Il est rangé dans Cadeaux › Reçus.");
    },
    onRequestEdit: requestEditWish,
    onToggleReaction: (member, wishId, reaction) =>
      wishesApi.toggleReaction(member, wishId, reaction, me),
    openCommentsId: openComments,
    onToggleComments: toggleComments,
    onOpenComments: openCommentsFor,
    online, // hors ligne : ajout de commentaire / édition / suppression masqués
    // Réservations : uniquement sur la liste des autres. Sur sa propre liste on
    // ne passe rien (et le serveur n'envoie rien de toute façon).
    canReserve: !isMine,
    reservations: activeResa,
    onReserve: async (member, wishId) => {
      if (await resa.reserve(member, wishId)) {
        cheerUp("trouve", `Bien joué ! C'est noté, et ${member} n'en saura rien.`);
      }
    },
    onUnreserve: resa.unreserve,
  };

  // Étapes de la visite guidée (cibles repérées par data-tour).
  const tourSteps = [
    {
      title: `Bienvenue ${me} !`,
      text: (
        <>
          Moi, c'est <strong>Clovis</strong>. Je fouine partout pour
          dénicher les envies de chacun. Je te fais visiter en 30 secondes&nbsp;?
        </>
      ),
      cta: "Allons-y",
      mascot: "wave",
      mine: true,
    },
    {
      target: "family",
      mine: true,
      text: (
        <>
          Voici <strong>la famille</strong>. Touche un prénom pour ouvrir sa liste d'envies.
        </>
      ),
    },
    {
      target: "add",
      mine: true,
      text: (
        <>
          Ça, c'est <strong>ta liste</strong>. Ajoute une envie, avec un lien si tu veux.
          Ensuite, glisse-les pour les classer&nbsp;: les trois premières sont mises en avant.
        </>
      ),
    },
    {
      target: "tools",
      mine: true,
      text:
        fullList.length > 0 ? (
          <>
            <strong>↻</strong> recharge les listes pour voir les dernières nouveautés. À côté,
            choisis l'affichage&nbsp;: <strong>une carte à la fois</strong> (à faire défiler) ou{" "}
            <strong>la liste complète</strong>.
          </>
        ) : (
          <>
            <strong>↻</strong> recharge les listes pour voir les dernières nouveautés. Dès qu'il y
            aura des envies, tu pourras aussi choisir l'affichage&nbsp;: une carte à la fois ou la
            liste complète.
          </>
        ),
    },
    {
      target: "nav-gifts",
      mine: true,
      mascot: "gift",
      text: (
        <>
          Sur la liste des autres, tu peux <strong>réserver</strong> un cadeau&nbsp;: la
          personne ne le saura jamais&nbsp;! Tes réservations et tes cadeaux reçus sont rangés
          dans <strong>Cadeaux</strong>.
        </>
      ),
    },
    {
      target: "nav-activity",
      mine: true,
      text: (
        <>
          <strong>Activité</strong>&nbsp;: les dernières nouveautés de la famille (ajouts,
          commentaires…).
        </>
      ),
    },
    {
      target: "nav-account",
      mine: true,
      mascot: "dance",
      text: (
        <>
          Et ton <strong>compte</strong>&nbsp;: ta couleur, ton code, et de quoi installer
          Souhaits comme une vraie appli. Bonne liste&nbsp;!
        </>
      ),
    },
  ];

  // Le souhait dont les commentaires sont ouverts.
  const commentWish = fullList.find((w) => w.id === openComments) || null;

  // Écran étroit + vue liste : les commentaires s'ouvrent dans une modale
  // (en bas de liste, ils passaient inaperçus). En carrousel : sous la carte,
  // et ils suivent la carte affichée. Grand écran : panneau latéral.
  const commentsInModal = isNarrow && view === "list";

  const refreshAll = () =>
    Promise.all([wishesApi.loadWishes(pin).catch(() => {}), resa.reload()]);

  const commentsProps = commentWish && {
    wish: commentWish,
    member: active,
    me,
    online,
    onAddComment: wishesApi.addComment,
    onDeleteComment: requestDeleteComment,
    onClose: closeComments,
  };

  return (
    <div className="shell">
      <Sidebar
        me={me}
        section={section}
        active={active}
        counts={counts}
        giftCount={giftCount}
        onOpenList={openList}
        onGo={go}
      />

      <main className="main">
        {!online && <OfflineBanner pending={wishesApi.pendingCount} />}

        {/* ================= LISTES ================= */}
        {section === "lists" && (
          <>
            <MemberStrip me={me} active={active} counts={counts} onSelect={openList} />

            <div
              className={
                "list-layout" + (commentWish && !commentsInModal ? " has-comments" : "")
              }
            >
              <section className="page list-col">
                <header className="page-head">
                  <Avatar name={active} size="lg" className="page-avatar" />
                  <div className="page-titles">
                    <h1 className="page-title">
                      {isMine ? "Ma liste" : `La liste de ${active}`}
                    </h1>
                    <p className="page-sub">
                      {activeWishes.length === 0
                        ? isMine
                          ? "Aucun souhait pour l'instant"
                          : "Aucune idée pour l'instant"
                        : isMine
                        ? activeWishes.length === 1
                          ? "1 souhait"
                          : `${activeWishes.length} souhaits, classés par envie`
                        : `${plural(activeWishes.length, "idée")} · ${
                            freeCount === 0
                              ? "tout est réservé"
                              : freeCount === activeWishes.length
                              ? "rien de réservé"
                              : `${freeCount} encore libre${freeCount > 1 ? "s" : ""}`
                          }`}
                    </p>
                  </div>
                  <div className="page-tools" data-tour="tools">
                    <RefreshButton onRefresh={refreshAll} />
                    {fullList.length > 0 && (
                      <ViewSwitch view={view} onChange={changeView} />
                    )}
                  </div>
                </header>

                {isMine &&
                  (online ? (
                    <AddForm
                      onAdd={async (name, link) => {
                        const first = rawList.length === 0;
                        await wishesApi.addWish(active, name, link);
                        if (first) cheerUp("bond", "Ta première envie ! La famille saura quoi t'offrir.");
                      }}
                    />
                  ) : (
                    <p className="hint">
                      L'ajout est indisponible hors ligne. Tu peux réordonner et réagir.
                    </p>
                  ))}

                {/* Liste d'un autre : filtre « encore libres » pour choisir vite. */}
                {!isMine && activeWishes.length > 0 && (
                  <div className="filter" role="group" aria-label="Filtrer les idées">
                    <button
                      className={"chip" + (!onlyFree ? " is-on" : "")}
                      onClick={() => setOnlyFree(false)}
                    >
                      Toutes
                    </button>
                    <button
                      className={"chip" + (onlyFree ? " is-on" : "")}
                      onClick={() => setOnlyFree(true)}
                    >
                      Encore libres <span className="chip-n">{freeCount}</span>
                    </button>
                  </div>
                )}

                {/* Ma liste : lien discret vers les cadeaux déjà reçus. */}
                {isMine && receivedHere > 0 && (
                  <button
                    className="hint hint-link"
                    onClick={() => {
                      setGiftsTab("received");
                      go("gifts");
                    }}
                  >
                    <Icon name="check" size={15} strokeWidth={2.2} />
                    <span>
                      {receivedHere === 1
                        ? "1 cadeau reçu a été retiré de ta liste"
                        : `${receivedHere} cadeaux reçus ont été retirés de ta liste`}
                    </span>
                    <Icon name="chevronRight" size={16} />
                  </button>
                )}

                {isMine && view === "list" && activeWishes.length > 1 && (
                  <p className="hint hint-quiet">
                    <ClovisArt pose="pointeur" width={58} className="hint-art" />
                    <span>
                      Glisse tes souhaits pour les classer : les trois premiers sont mis en
                      avant.
                    </span>
                  </p>
                )}

                {listsLoading ? (
                  <div className="empty-state empty-loading">
                    <ClovisArt pose="fouille" width={120} className="empty-art" />
                    <p className="empty-text">Clovis fouille dans les listes…</p>
                  </div>
                ) : list.length === 0 ? (
                  <div className="empty-state">
                    <ClovisArt
                      pose={filtering ? "decu" : "sieste"}
                      width={filtering ? 110 : 130}
                      className="empty-art"
                    />
                    {filtering ? (
                      <>
                        <p className="empty-title">Tout est déjà réservé</p>
                        <p className="empty-text">
                          Plus aucune idée libre dans la liste de {active} pour le
                          moment.
                        </p>
                      </>
                    ) : isMine ? (
                      <>
                        <p className="empty-title">Ta liste est vide</p>
                        <p className="empty-text">
                          Ajoute ta première envie juste au-dessus : la famille saura
                          quoi t'offrir.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="empty-title">{active} n'a encore rien ajouté</p>
                        <p className="empty-text">Reviens un peu plus tard.</p>
                      </>
                    )}
                  </div>
                ) : (
                  <ViewTransition trigger={view}>
                    {view === "carousel" ? (
                      <WishCarousel list={list} itemProps={itemProps} />
                    ) : (
                      <SortableWishList
                        list={list}
                        itemProps={itemProps}
                        enabled={isMine}
                        onReorder={(ids) => wishesApi.reorderWishes(active, ids)}
                      />
                    )}
                  </ViewTransition>
                )}
              </section>

              {/* Toujours présent (vide quand fermé) pour que l'ouverture s'anime.
                  Vide aussi quand les commentaires passent en modale. */}
              <aside className="comment-side">
                {commentWish && !commentsInModal && (
                  <CommentsPanel key={commentWish.id} variant="side" {...commentsProps} />
                )}
              </aside>
            </div>
          </>
        )}

        {/* ================= CADEAUX (à offrir / reçus) ================= */}
        {section === "gifts" && (
          <GiftsPage
            groups={giftGroups}
            received={received}
            tab={giftsTab}
            onTab={setGiftsTab}
            online={online}
            onUnreserve={resa.unreserve}
            onRestore={(wishId) => wishesApi.setWishDisabled(me, wishId, false)}
            onOpenList={openList}
          />
        )}

        {/* ================= ACTIVITÉ ================= */}
        {section === "activity" && (
          <ActivityPage
            items={historyApi.items}
            loading={historyApi.loading}
            online={online}
            onRefresh={() => historyApi.load(true)}
          />
        )}

        {/* ================= COMPTE ================= */}
        {section === "account" && (
          <AccountPage
            me={me}
            online={online}
            wishCount={counts[me] || 0}
            giftCount={giftCount}
            biometricAvailable={biometric.available}
            biometricEnrolled={biometric.enrolled.includes(me)}
            onPickColor={async (c) => {
              await profileApi.setColor(pin, { member: me, color: c });
              const next = { ...colors, [me]: c };
              setColorOverrides(next);
              setColors(next);
            }}
            onChangePin={async (code) => {
              await updateUserPin(pin, { member: me, code });
              await offline.setUserPinHash(me, code);
            }}
            onEnrollBiometric={() => biometric.enroll(pin, me)}
            installed={install.installed}
            canInstall={install.canPrompt}
            onInstall={installNow}
            onOpenInstallGuide={() => setGuideOpen(true)}
            flashInstall={flashInstall}
            onClearCache={() => wishesApi.clearOfflineData()}
            onReplayTour={() => {
              openList(me);
              setTourOpen(true);
            }}
            onChangeProfile={() => {
              setOpenComments(null);
              go("lists");
              setMe(null);
            }}
            onLogout={() => auth.logout()}
          />
        )}
      </main>

      {/* Téléphone, appli pas encore installée : bulle « Psssttt » au-dessus
          de l'onglet Compte (une seule fois, jusqu'à ce qu'elle soit fermée). */}
      {install.platform &&
        tourSeen &&
        !tourOpen &&
        !install.installed &&
        !hintHidden &&
        section !== "account" &&
        isTouchPlatform(install.platform) && (
          <InstallNudge onGo={followNudge} onDismiss={hideHint} />
        )}

      <ClovisToast cheer={cheer} onDone={() => setCheer(null)} />

      <BottomNav
        me={me}
        section={section}
        giftCount={giftCount}
        onGo={go}
        nudge={Boolean(
          install.platform && !install.installed && !hintHidden && isTouchPlatform(install.platform)
        )}
      />

      {/* Écran étroit + vue liste : commentaires dans une modale. */}
      {section === "lists" && commentWish && commentsInModal && (
        <div className="overlay" onClick={closeComments}>
          <div className="sheet sheet-comments" onClick={(e) => e.stopPropagation()}>
            <CommentsPanel key={commentWish.id} variant="modal" {...commentsProps} />
          </div>
        </div>
      )}

      {tourOpen && (
        <Tour
          steps={tourSteps}
          onStep={(s) => {
            if (s.mine && (section !== "lists" || active !== me)) openList(me);
          }}
          onClose={closeTour}
        />
      )}

      {guideOpen && (
        <InstallGuide
          platform={install.platform}
          canPrompt={install.canPrompt}
          onPrompt={installNow}
          onClose={() => setGuideOpen(false)}
        />
      )}

      {confirmData && (
        <ConfirmModal
          message={confirmData.message}
          onCancel={() => setConfirmData(null)}
          onConfirm={() => {
            confirmData.action();
            setConfirmData(null);
          }}
        />
      )}

      {editData && (
        <EditModal
          wish={editData.wish}
          onCancel={() => setEditData(null)}
          onSave={(name, link) => {
            wishesApi.editWish(editData.member, editData.wish.id, name, link);
            setEditData(null);
          }}
        />
      )}
    </div>
  );
}

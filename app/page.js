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

  // Profil sélectionné dans le choix des profils, en attente de son code PIN.
  const [pendingProfile, setPendingProfile] = useState(null);

  // Couleurs partagées (choisies dans « Mon compte »).
  const [colors, setColors] = useState({});

  // État transitoire d'UI (remis à zéro à la déconnexion).
  const [openComments, setOpenComments] = useState(null);
  const [confirmData, setConfirmData] = useState(null); // { message, action }
  const [editData, setEditData] = useState(null); // { member, wish }
  const [onlyFree, setOnlyFree] = useState(false); // filtre « encore libres »

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

  // Souhaits actifs d'abord (dans l'ordre choisi), « déjà reçus » en fin de liste.
  const rawList = wishesApi.wishes[active] || [];
  const activeWishes = rawList.filter((w) => !w.disabled);
  const fullList = [...activeWishes, ...rawList.filter((w) => w.disabled)];

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

  // « À offrir » : mes réservations, regroupées par personne. Construit à partir
  // des données déjà en mémoire (aucune requête).
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

  // Props communes à chaque souhait (liste ou carrousel).
  const itemProps = {
    member: active,
    me,
    canEdit: isMine,
    ranks,
    onDelete: requestDeleteWish,
    onSetDisabled: wishesApi.setWishDisabled,
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
    onReserve: resa.reserve,
    onUnreserve: resa.unreserve,
  };

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
                        ? `${plural(activeWishes.length, "souhait")}, classés par envie`
                        : `${plural(activeWishes.length, "idée")} · ${
                            freeCount === 0
                              ? "tout est réservé"
                              : freeCount === activeWishes.length
                              ? "rien de réservé"
                              : `${freeCount} encore libre${freeCount > 1 ? "s" : ""}`
                          }`}
                    </p>
                  </div>
                  <div className="page-tools">
                    <RefreshButton onRefresh={refreshAll} />
                    {fullList.length > 0 && (
                      <ViewSwitch view={view} onChange={changeView} />
                    )}
                  </div>
                </header>

                {isMine &&
                  (online ? (
                    <AddForm
                      onAdd={(name, link) => wishesApi.addWish(active, name, link)}
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

                {isMine && view === "list" && activeWishes.length > 1 && (
                  <p className="hint hint-quiet">
                    <Icon name="grip" size={14} /> Glisse tes souhaits pour les classer :
                    les trois premiers sont mis en avant.
                  </p>
                )}

                {list.length === 0 ? (
                  <div className="empty-state">
                    <span className="empty-icon">
                      <Icon name="gift" size={30} />
                    </span>
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

        {/* ================= À OFFRIR ================= */}
        {section === "gifts" && (
          <GiftsPage
            groups={giftGroups}
            online={online}
            onUnreserve={resa.unreserve}
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
            onClearCache={() => wishesApi.clearOfflineData()}
            onChangeProfile={() => {
              setOpenComments(null);
              go("lists");
              setMe(null);
            }}
            onLogout={() => auth.logout()}
          />
        )}
      </main>

      <BottomNav me={me} section={section} giftCount={giftCount} onGo={go} />

      {/* Écran étroit + vue liste : commentaires dans une modale. */}
      {section === "lists" && commentWish && commentsInModal && (
        <div className="overlay" onClick={closeComments}>
          <div className="sheet sheet-comments" onClick={(e) => e.stopPropagation()}>
            <CommentsPanel key={commentWish.id} variant="modal" {...commentsProps} />
          </div>
        </div>
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

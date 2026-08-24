"use client";

import { useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { useWishes } from "./hooks/useWishes";
import { useProfile } from "./hooks/useProfile";
import { useHistory } from "./hooks/useHistory";
import { useView } from "./hooks/useView";
import { useIsMobile } from "./hooks/useIsMobile";
import { useBiometric } from "./hooks/useBiometric";
import { useOnline } from "./hooks/useOnline";
import Gate from "./components/Gate";
import ProfilePicker from "./components/ProfilePicker";
import ProfilePinGate from "./components/ProfilePinGate";
import AppHeader from "./components/AppHeader";
import MemberTabs from "./components/MemberTabs";
import AddForm from "./components/AddForm";
import ViewSwitch from "./components/ViewSwitch";
import RefreshButton from "./components/RefreshButton";
import ViewTransition from "./components/ViewTransition";
import WishCarousel from "./components/WishCarousel";
import SortableWishList from "./components/SortableWishList";
import CommentsPanel from "./components/CommentsPanel";
import HistoryModal from "./components/HistoryModal";
import ConfirmModal from "./components/ConfirmModal";
import EditModal from "./components/EditModal";
import OfflineBanner from "./components/OfflineBanner";

export default function Home() {
  // Le PIN est la source unique de vérité, partagée entre l'auth et les données.
  const [pin, setPin] = useState("");

  const wishesApi = useWishes(pin);
  const { me, setMe, active, setActive, chooseMe } = useProfile();
  const { view, changeView } = useView();
  const isMobile = useIsMobile();
  const historyApi = useHistory(pin);
  const biometric = useBiometric();
  const online = useOnline();

  // Profil sélectionné dans le choix des profils, en attente de son code PIN.
  const [pendingProfile, setPendingProfile] = useState(null);

  // État transitoire d'UI (remis à zéro à la déconnexion).
  const [openComments, setOpenComments] = useState(null);
  const [confirmData, setConfirmData] = useState(null); // { message, action }
  const [editData, setEditData] = useState(null); // { member, wish }

  const auth = useAuth({
    setPin,
    loadWishes: wishesApi.loadWishes,
    onLogout: () => {
      wishesApi.flushReorder();
      historyApi.close();
      setConfirmData(null);
      setEditData(null);
      setOpenComments(null);
      setPendingProfile(null);
    },
  });

  const toggleComments = (id) =>
    setOpenComments((cur) => (cur === id ? null : id));
  const openCommentsFor = (id) => setOpenComments(id);
  const closeComments = () => setOpenComments(null);

  function askConfirm(message, action) {
    setConfirmData({ message, action });
  }

  // Demandes de suppression / modification -> passent par les popups.
  function requestDeleteWish(member, wish) {
    askConfirm(`Supprimer « ${wish.name} » ?`, () =>
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
        onChoose={setPendingProfile}
        online={online}
        biometricAvailable={biometric.available}
        onBiometric={async () => {
          const member = await biometric.unlock(pin);
          chooseMe(member);
        }}
      />
    );
  }

  // ---------- APPLI ----------
  const list = wishesApi.wishes[active] || [];
  const isMine = active === me;

  // Props communes à chaque souhait (liste ou carrousel).
  const itemProps = {
    member: active,
    me,
    canEdit: isMine,
    onDelete: requestDeleteWish,
    onRequestEdit: requestEditWish,
    onToggleReaction: (member, wishId, reaction) =>
      wishesApi.toggleReaction(member, wishId, reaction, me),
    openCommentsId: openComments,
    onToggleComments: toggleComments,
    onOpenComments: openCommentsFor,
    online, // hors ligne : ajout de commentaire / édition / suppression masqués
  };

  // Le souhait dont les commentaires sont ouverts (pour le panneau latéral).
  const commentWish = list.find((w) => w.id === openComments) || null;

  // Sur petit écran EN VUE LISTE, les commentaires s'ouvrent dans une modale
  // (plutôt qu'en bas de la liste, où ils passaient inaperçus s'il y a beaucoup
  // d'objets). En carrousel et sur desktop : comportement inchangé.
  const commentsInModal = isMobile && view === "list";

  return (
    <main className="app">
      <div
        className={
          "app-main" + (commentWish && !commentsInModal ? " has-comments" : "")
        }
      >
        <div className="app-col">
          {!online && <OfflineBanner pending={wishesApi.pendingCount} />}

          <AppHeader
            me={me}
            onChangeProfile={() => setMe(null)}
            onOpenHistory={historyApi.openHistory}
            canEnableBiometric={online && biometric.available}
            biometricEnrolled={biometric.enrolled.includes(me)}
            onEnableBiometric={() => biometric.enroll(pin, me)}
          />

          <MemberTabs
            active={active}
            wishes={wishesApi.wishes}
            onSelect={(m) => {
              setActive(m);
              setOpenComments(null);
            }}
          />

          <div className="panel-row">
            <section className="panel">
              {isMine ? (
                online ? (
                  <AddForm onAdd={(name, link) => wishesApi.addWish(active, name, link)} />
                ) : (
                  <p className="view-note">
                    Ajout indisponible hors ligne. Tu peux réordonner et réagir.
                  </p>
                )
              ) : (
                <p className="view-note">
                  Tu regardes la liste de {active}. Tu ne peux ajouter que sur la tienne.
                </p>
              )}

              <div className="list-toolbar">
                <RefreshButton
                  onRefresh={() => wishesApi.loadWishes(pin).catch(() => {})}
                />
                {list.length > 0 && (
                  <ViewSwitch view={view} onChange={changeView} />
                )}
              </div>

              {list.length === 0 ? (
                <p className="empty">Aucun souhait pour l'instant.</p>
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
                <CommentsPanel
                  key={commentWish.id}
                  wish={commentWish}
                  member={active}
                  me={me}
                  variant="side"
                  online={online}
                  onAddComment={wishesApi.addComment}
                  onDeleteComment={requestDeleteComment}
                  onClose={closeComments}
                />
              )}
            </aside>
          </div>
        </div>
      </div>

      {/* Petit écran + vue liste : commentaires dans une modale. */}
      {commentWish && commentsInModal && (
        <div className="overlay" onClick={closeComments}>
          <div className="comment-modal-wrap" onClick={(e) => e.stopPropagation()}>
            <CommentsPanel
              key={commentWish.id}
              wish={commentWish}
              member={active}
              me={me}
              variant="modal"
              online={online}
              onAddComment={wishesApi.addComment}
              onDeleteComment={requestDeleteComment}
              onClose={closeComments}
            />
          </div>
        </div>
      )}

      {historyApi.open && (
        <HistoryModal
          items={historyApi.items}
          loading={historyApi.loading}
          onClose={historyApi.close}
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
    </main>
  );
}

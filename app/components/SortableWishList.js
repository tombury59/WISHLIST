"use client";

import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  restrictToVerticalAxis,
  restrictToParentElement,
} from "@dnd-kit/modifiers";
import WishItem from "./WishItem";

// Un souhait déplaçable : on branche useSortable et on transmet la « poignée »
// (toute la ligne) + le style de translation à WishItem.
function SortableWish({ wish, rank, itemProps }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: wish.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <WishItem
      wish={wish}
      variant="list"
      rank={rank}
      {...itemProps}
      dragRef={setNodeRef}
      dragStyle={style}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
    />
  );
}

// Liste des souhaits en vue « liste ».
// - `enabled` (= c'est MA liste) : glisser-déposer actif.
// - sinon : liste simple, identique à avant.
export default function SortableWishList({ list, itemProps, enabled, onReorder }) {
  // Ordre des capteurs :
  // - Souris : petit seuil de distance (le clic simple reste un clic).
  // - Tactile : APPUI LONG (250 ms) puis glissement — le scroll reste possible
  //   tant qu'on n'a pas maintenu, et un simple tap ouvre les liens/boutons.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (!enabled) {
    return (
      <ul className="wish-list">
        {list.map((w, i) => (
          <WishItem
            key={w.id}
            wish={w}
            variant="list"
            rank={i < 3 ? i + 1 : 0}
            {...itemProps}
          />
        ))}
      </ul>
    );
  }

  function handleDragStart() {
    // Petit retour physique au moment où la ligne « s'attrape ».
    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(10);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = list.findIndex((w) => w.id === active.id);
    const newIndex = list.findIndex((w) => w.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const ids = arrayMove(list, oldIndex, newIndex).map((w) => w.id);
    onReorder(ids);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis, restrictToParentElement]}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={list.map((w) => w.id)} strategy={verticalListSortingStrategy}>
        <ul className="wish-list wish-list--sortable">
          {list.map((w, i) => (
            <SortableWish
              key={w.id}
              wish={w}
              rank={i < 3 ? i + 1 : 0}
              itemProps={itemProps}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

"use client";

import { useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import WishItem from "./WishItem";

// Carrousel (librairie Embla) : une carte devant, les voisines en retrait.
export default function WishCarousel({ list, highlights, itemProps }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "center",
    loop: false,
    containScroll: false, // la 1re et la dernière peuvent se centrer aussi
    dragFree: false, // un glissement = on se cale sur l'item le plus proche
  });

  // Quand la carte centrée change ET que les commentaires sont ouverts, on met
  // à jour le panneau avec ceux de la carte affichée. On lit l'état via une ref
  // pour garder le handler Embla (abonné une seule fois) toujours à jour.
  const syncRef = useRef({});
  syncRef.current = {
    openCommentsId: itemProps.openCommentsId,
    onOpenComments: itemProps.onOpenComments,
    list,
  };
  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => {
      const { openCommentsId, onOpenComments, list } = syncRef.current;
      if (!openCommentsId) return; // commentaires fermés -> on ne touche à rien
      const wish = list[emblaApi.selectedScrollSnap()];
      if (wish && wish.id !== openCommentsId) onOpenComments(wish.id);
    };
    emblaApi.on("select", onSelect);
    return () => emblaApi.off("select", onSelect);
  }, [emblaApi]);

  // Effet « une carte devant, les voisines en arrière » : on réduit et estompe
  // les cartes selon leur distance au centre, mis à jour à chaque frame.
  useEffect(() => {
    if (!emblaApi) return;
    const nodes = emblaApi.slideNodes();
    const run = () => {
      const progress = emblaApi.scrollProgress();
      const snaps = emblaApi.scrollSnapList();
      const span = Math.max(1, snaps.length - 1);
      snaps.forEach((snap, i) => {
        const d = Math.abs((snap - progress) * span); // 0 = au centre
        const scale = Math.max(0.8, 1 - d * 0.16);
        const opacity = Math.max(0.35, 1 - d * 0.5);
        const node = nodes[i];
        if (node) {
          node.style.transform = `scale(${scale})`;
          node.style.opacity = String(opacity);
        }
      });
    };
    run();
    emblaApi.on("scroll", run);
    emblaApi.on("reInit", run);
    return () => {
      emblaApi.off("scroll", run);
      emblaApi.off("reInit", run);
    };
  }, [emblaApi]);

  return (
    <div className="carousel">
      <button
        type="button"
        className="carousel-arrow carousel-prev"
        onClick={() => emblaApi && emblaApi.scrollPrev()}
        aria-label="Précédent"
      >
        ‹
      </button>
      <div className="embla" ref={emblaRef}>
        <div className="embla__container">
          {list.map((w) => (
            <div className="embla__slide" key={w.id}>
              <WishItem
                wish={w}
                variant="card"
                highlighted={highlights.includes(w.id)}
                {...itemProps}
              />
            </div>
          ))}
        </div>
      </div>
      <button
        type="button"
        className="carousel-arrow carousel-next"
        onClick={() => emblaApi && emblaApi.scrollNext()}
        aria-label="Suivant"
      >
        ›
      </button>
    </div>
  );
}

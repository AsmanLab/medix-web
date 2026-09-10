import { useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const THRESHOLD = 70;
const MAX_PULL = 90;
const MIN_SPIN_MS = 500;

/**
 * «Потянуть вниз — обновить» для сайта, добавленного на домашний экран.
 *
 * В PWA-режиме (display: standalone) у страницы нет кнопки браузера
 * «обновить» — единственный способ подтянуть свежие данные без выхода из
 * приложения. Работает поверх текущих данных (refetch активных запросов +
 * инвалидация роутера), а не `location.reload()`: полная перезагрузка на
 * телефоне даёт заметный белый экран и заново гоняет bootstrap сессии,
 * потому что access-токен живёт только в памяти вкладки.
 *
 * Жест вешается только при сенсорном вводе (`pointer: coarse`) — на
 * десктопе для обновления есть F5, а перехват колеса мыши только мешал бы.
 */
export function PullToRefresh() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const tracking = useRef(false);
  const pullRef = useRef(0);
  const refreshingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;

    function scrollableAncestor(node: EventTarget | null): boolean {
      let el = node instanceof Element ? node : null;
      while (el) {
        if (el.scrollTop > 0) return true;
        el = el.parentElement;
      }
      return false;
    }

    function onTouchStart(e: TouchEvent) {
      if (refreshingRef.current) return;
      if (e.touches.length !== 1) return;
      if (window.scrollY > 0) return;
      if (document.body.style.overflow === "hidden") return;
      if (scrollableAncestor(e.target)) return;

      tracking.current = true;
      startY.current = e.touches[0].clientY;
    }

    function onTouchMove(e: TouchEvent) {
      if (!tracking.current || refreshingRef.current) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        tracking.current = false;
        pullRef.current = 0;
        setPull(0);
        return;
      }
      e.preventDefault();
      const next = Math.min(MAX_PULL, dy * 0.5);
      pullRef.current = next;
      setPull(next);
    }

    async function onTouchEnd() {
      if (!tracking.current) return;
      tracking.current = false;

      if (pullRef.current < THRESHOLD) {
        pullRef.current = 0;
        setPull(0);
        return;
      }

      refreshingRef.current = true;
      setRefreshing(true);
      const startedAt = Date.now();
      try {
        await Promise.all([
          queryClient.refetchQueries({ type: "active" }),
          router.invalidate(),
        ]);
      } finally {
        const elapsed = Date.now() - startedAt;
        if (elapsed < MIN_SPIN_MS) {
          await new Promise((resolve) => setTimeout(resolve, MIN_SPIN_MS - elapsed));
        }
        refreshingRef.current = false;
        pullRef.current = 0;
        setRefreshing(false);
        setPull(0);
      }
    }

    document.addEventListener("touchstart", onTouchStart, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);

    return () => {
      document.removeEventListener("touchstart", onTouchStart);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [queryClient, router]);

  const visible = pull > 0 || refreshing;
  if (!visible) return null;

  const progress = Math.min(1, pull / THRESHOLD);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[60] flex justify-center"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div
        className="mt-2 grid h-9 w-9 place-items-center rounded-full bg-card text-primary shadow-[var(--shadow-soft)] transition-opacity"
        style={{
          transform: `translateY(${Math.min(pull, MAX_PULL)}px)`,
          opacity: refreshing ? 1 : progress,
        }}
      >
        <Loader2
          className={cn("h-4 w-4", refreshing && "animate-spin")}
          style={refreshing ? undefined : { transform: `rotate(${progress * 360}deg)` }}
        />
      </div>
    </div>
  );
}

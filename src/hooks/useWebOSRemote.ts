import { useEffect, useState } from 'react';

/**
 * Códigos de teclas oficiales de controles remotos LG webOS:
 * - 403: Botón ROJO (Red)
 * - 404: Botón VERDE (Green)
 * - 405: Botón AMARILLO (Yellow) -> Acción principal solicitada: Agregar/Quitar Favorito
 * - 406: Botón AZUL (Blue)
 * - 461: Botón BACK en LG webOS
 * - 427 / 33: Canal Arriba (CH+ / PageUp)
 * - 428 / 34: Canal Abajo (CH- / PageDown)
 * - 415: Play
 * - 19: Pause
 * - 413: Stop
 */
export interface WebOSRemoteHandlers {
  onYellowButton: () => void;
  onRedButton: () => void;
  onGreenButton: () => void;
  onBlueButton: () => void;
  onBackButton: () => void;
  onChannelUp?: () => void;
  onChannelDown?: () => void;
  onNavigateArrow?: (direction: 'up' | 'down' | 'left' | 'right' | 'enter') => void;
}

export function useWebOSRemote(handlers: WebOSRemoteHandlers) {
  const [isPointerMode, setIsPointerMode] = useState<boolean>(true);
  const [lastRemoteKeyBadge, setLastRemoteKeyBadge] = useState<string | null>(null);

  useEffect(() => {
    let badgeTimer: number | undefined;

    const triggerBadge = (label: string) => {
      setLastRemoteKeyBadge(label);
      if (badgeTimer) window.clearTimeout(badgeTimer);
      badgeTimer = window.setTimeout(() => setLastRemoteKeyBadge(null), 1600);
    };

    const handleMouseMove = () => {
      if (!isPointerMode) {
        setIsPointerMode(true);
      }
    };

    const handleCursorStateChange = (event: Event) => {
      const customEvt = event as CustomEvent<{ visibility?: boolean }>;
      if (customEvt.detail && typeof customEvt.detail.visibility === 'boolean') {
        setIsPointerMode(customEvt.detail.visibility);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      const keyCode = e.keyCode || e.which;
      const key = e.key;

      // 1. BOTÓN AMARILLO (LG webOS KeyCode 405, o atajo teclado Y / F / F3 cuando no se escribe en un input)
      if (
        keyCode === 405 ||
        key === 'ColorF2Yellow' ||
        (!isInputFocused && (key === 'y' || key === 'Y' || key === 'f' || key === 'F' || key === 'F3'))
      ) {
        e.preventDefault();
        triggerBadge('Botón Amarillo • Favoritos');
        handlers.onYellowButton();
        return;
      }

      // 2. BOTÓN ROJO (LG webOS KeyCode 403, o atajo teclado R / F1 fuera de inputs)
      if (
        keyCode === 403 ||
        key === 'ColorF0Red' ||
        (!isInputFocused && (key === 'r' || key === 'R' || key === 'F1'))
      ) {
        e.preventDefault();
        triggerBadge('Botón Rojo • Listas IPTV');
        handlers.onRedButton();
        return;
      }

      // 3. BOTÓN VERDE (LG webOS KeyCode 404, o atajo teclado G / '/' / F2 fuera de inputs)
      if (
        keyCode === 404 ||
        key === 'ColorF1Green' ||
        (!isInputFocused && (key === 'g' || key === 'G' || key === '/' || key === 'F2'))
      ) {
        e.preventDefault();
        triggerBadge('Botón Verde • Buscar');
        handlers.onGreenButton();
        return;
      }

      // 4. BOTÓN AZUL (LG webOS KeyCode 406, o atajo teclado B / F4 fuera de inputs)
      if (
        keyCode === 406 ||
        key === 'ColorF3Blue' ||
        (!isInputFocused && (key === 'b' || key === 'B' || key === 'F4'))
      ) {
        e.preventDefault();
        triggerBadge('Botón Azul • Ver Favoritos');
        handlers.onBlueButton();
        return;
      }

      // 5. BOTÓN BACK de LG webOS (KeyCode 461 o Escape)
      if (keyCode === 461 || key === 'GoBack' || key === 'Escape' || (!isInputFocused && key === 'Backspace')) {
        e.preventDefault();
        handlers.onBackButton();
        return;
      }

      // Si el usuario está escribiendo dentro de un campo de texto, no interceptar flechas ni letras
      if (isInputFocused) {
        return;
      }

      // 6. Canal Arriba / Abajo (CH+ / CH-)
      if (keyCode === 427 || key === 'ChannelUp' || key === 'PageUp') {
        e.preventDefault();
        handlers.onChannelUp?.();
        return;
      }
      if (keyCode === 428 || key === 'ChannelDown' || key === 'PageDown') {
        e.preventDefault();
        handlers.onChannelDown?.();
        return;
      }

      // 7. Navegación con Cruceta (D-Pad del Magic Remote)
      if (key === 'ArrowUp') {
        e.preventDefault();
        setIsPointerMode(false);
        handlers.onNavigateArrow?.('up');
      } else if (key === 'ArrowDown') {
        e.preventDefault();
        setIsPointerMode(false);
        handlers.onNavigateArrow?.('down');
      } else if (key === 'ArrowLeft') {
        e.preventDefault();
        setIsPointerMode(false);
        handlers.onNavigateArrow?.('left');
      } else if (key === 'ArrowRight') {
        e.preventDefault();
        setIsPointerMode(false);
        handlers.onNavigateArrow?.('right');
      } else if (key === 'Enter') {
        e.preventDefault();
        handlers.onNavigateArrow?.('enter');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    document.addEventListener('cursorStateChange', handleCursorStateChange);

    return () => {
      if (badgeTimer) window.clearTimeout(badgeTimer);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('cursorStateChange', handleCursorStateChange);
    };
  }, [handlers, isPointerMode]);

  return { isPointerMode, lastRemoteKeyBadge };
}

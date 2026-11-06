import React from 'react';

interface ColorKeyLegendProps {
  onRedPress: () => void;
  onGreenPress: () => void;
  onYellowPress: () => void;
  onBluePress: () => void;
  activeTargetName?: string;
  isActiveTargetFavorite?: boolean;
  lastRemoteKeyBadge: string | null;
}

export const ColorKeyLegend: React.FC<ColorKeyLegendProps> = ({
  onRedPress,
  onGreenPress,
  onYellowPress,
  onBluePress,
  activeTargetName,
  isActiveTargetFavorite,
  lastRemoteKeyBadge,
}) => {
  return (
    <footer className="color-key-footer">
      <div className="color-keys-group">
        <button
          type="button"
          className="color-key-pill red-pill"
          onClick={onRedPress}
          title="Atajo Control LG: Botón Rojo (o tecla R)"
        >
          <span className="color-brick red" />
          <span className="key-label">Agregar / Gestionar Listas</span>
        </button>

        <button
          type="button"
          className="color-key-pill green-pill"
          onClick={onGreenPress}
          title="Atajo Control LG: Botón Verde (o tecla G / '/')"
        >
          <span className="color-brick green" />
          <span className="key-label">Buscar en Todas las Listas</span>
        </button>

        <button
          type="button"
          className="color-key-pill yellow-pill highlight-yellow"
          onClick={onYellowPress}
          title="Atajo Control LG: Botón Amarillo (KeyCode 405 o tecla Y / F)"
        >
          <span className="color-brick yellow" />
          <span className="key-label">
            {isActiveTargetFavorite
              ? 'Quitar de Favoritos'
              : 'Agregar a Favoritos'}
            {activeTargetName ? ` (${activeTargetName})` : ''}
          </span>
        </button>

        <button
          type="button"
          className="color-key-pill blue-pill"
          onClick={onBluePress}
          title="Atajo Control LG: Botón Azul (o tecla B)"
        >
          <span className="color-brick blue" />
          <span className="key-label">Ir a Mis Favoritos</span>
        </button>
      </div>

      <div className="remote-status-right">
        {lastRemoteKeyBadge ? (
          <span className="remote-toast-pill">{lastRemoteKeyBadge}</span>
        ) : (
          <div className="magic-remote-hints">
            <span className="hint-chip">🖱️ Puntero + Rueda Magic Remote</span>
            <span className="hint-chip">⏎ OK: Previsualizar / Pantalla Completa</span>
          </div>
        )}
      </div>
    </footer>
  );
};

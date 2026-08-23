/** 精靈骰塔劇場：React 提供戲框，PixiJS 只繪製即時戰場，不保存任何遊戲規則。 */
import { useEffect, useRef } from "react";
import { Application, Container, Graphics } from "pixi.js";
import type { RunState } from "@/game/types";
import GameScreen from "@/pages/GameScreen";

interface PixiBattleProps { run?: RunState; }

export function PixiBattle({ run }: PixiBattleProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const appRef = useRef<Application | null>(null);
  const layerRef = useRef<Container | null>(null);

  useEffect(() => {
    let mounted = true;
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas || appRef.current) return;
    const app = new Application();
    app.init({ canvas, width: host.clientWidth || 390, height: host.clientHeight || 275, backgroundAlpha: 0, antialias: true, resolution: Math.min(window.devicePixelRatio || 1, 2) }).then(() => {
      if (!mounted) { app.destroy(true); return; }
      const layer = new Container();
      app.stage.addChild(layer);
      appRef.current = app;
      layerRef.current = layer;
      const resize = () => app.renderer.resize(host.clientWidth || 390, host.clientHeight || 275);
      const observer = new ResizeObserver(resize);
      observer.observe(host);
      (host as HTMLDivElement & { __pixiObserver?: ResizeObserver }).__pixiObserver = observer;
    });
    return () => {
      mounted = false;
      (host as HTMLDivElement & { __pixiObserver?: ResizeObserver }).__pixiObserver?.disconnect();
      layerRef.current = null;
      appRef.current = null;
      app.destroy(true);
    };
  }, []);

  useEffect(() => {
    const app = appRef.current;
    const layer = layerRef.current;
    if (!app || !layer) return;
    layer.removeChildren().forEach((child) => child.destroy());
    const width = app.renderer.width;
    const height = app.renderer.height;
    const createShape = (x: number, y: number, radius: number, color: string, boss = false) => {
      const graphic = new Graphics();
      graphic.circle(x, y, radius).fill(color).stroke({ color: 0x18324c, width: boss ? 3 : 2, alpha: 0.82 });
      if (boss) graphic.circle(x, y, radius + 7).stroke({ color: 0xf5bd42, width: 2, alpha: 0.8 });
      layer.addChild(graphic);
    };
    run?.combat.enemies.forEach((enemy) => {
      const curve = Math.sin(enemy.pathProgress * Math.PI * 2.1) * width * 0.18;
      const x = width * 0.5 + curve;
      const y = height * (0.08 + enemy.pathProgress * 0.78);
      const color = enemy.enemyId === "boss" ? "#5c4b9d" : enemy.enemyId === "eliteGiant" ? "#66835f" : enemy.enemyId === "wolf" ? "#c49255" : enemy.enemyId === "bomber" ? "#d8794f" : "#55a5dd";
      createShape(x, y, enemy.enemyId === "boss" ? 19 : enemy.enemyId === "eliteGiant" ? 15 : 10, color, enemy.enemyId === "boss");
      const hp = Math.max(0, enemy.hp / enemy.maxHp);
      const health = new Graphics().roundRect(x - 15, y - 20, 30, 4, 2).fill(0x18263a);
      health.roundRect(x - 15, y - 20, 30 * hp, 4, 2).fill(0xf06c62);
      layer.addChild(health);
    });
    run?.combat.damageEvents.forEach((event) => {
      const dot = new Graphics().circle(event.x * width, event.y * height, event.kind === "heal" ? 6 : 4).fill(event.kind === "heal" ? 0x9ee36f : event.kind === "shield" ? 0x55d4cf : 0xf9d063);
      layer.addChild(dot);
    });
  }, [run]);

  return <div className="pixi-battle" ref={hostRef}><canvas ref={canvasRef} aria-label="即時戰場動畫" /></div>;
}

/** React 全螢幕遊戲入口；PixiBattle 僅是其內的即時戰場圖層。 */
export default function GameCanvas() {
  return <GameScreen />;
}

// Neon Bay — particles / floating text effects (skids, sparks, cash popups).
export class Effects {
  constructor() { this.parts = []; this.texts = []; }
  burst(x, y, color, n = 10, speed = 120) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      this.parts.push({ x, y, vx: Math.cos(a) * speed * (0.4 + Math.random()), vy: Math.sin(a) * speed * (0.4 + Math.random()), life: 0.5 + Math.random() * 0.4, max: 0.9, color, r: 2 + Math.random() * 3 });
    }
  }
  skid(x, y) { this.parts.push({ x, y, vx: 0, vy: 0, life: 0.4, max: 0.4, color: '#64748b', r: 3 }); }
  popup(x, y, text, color = '#4ade80') { this.texts.push({ x, y, text, color, life: 1.6 }); }
  update(dt) {
    for (const p of this.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt; }
    this.parts = this.parts.filter((p) => p.life > 0);
    for (const t of this.texts) { t.y -= 24 * dt; t.life -= dt; }
    this.texts = this.texts.filter((t) => t.life > 0);
  }
  draw(ctx, cam) {
    for (const p of this.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x - cam.x, p.y - cam.y, p.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life);
      ctx.font = 'bold 16px system-ui, sans-serif';
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x - cam.x, t.y - cam.y);
    }
    ctx.globalAlpha = 1;
  }
}

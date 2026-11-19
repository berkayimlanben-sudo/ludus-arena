(function (Game) {
    class SoundFX {
        constructor() {
            this.enabled = true;
            this.ctx = null;
        }

        _getCtx() {
            if (!this.enabled) return null;
            try {
                if (!this.ctx) {
                    const AudioCtx = window.AudioContext || window.webkitAudioContext;
                    if (!AudioCtx) return null;
                    this.ctx = new AudioCtx();
                }
                if (this.ctx.state === 'suspended') {
                    this.ctx.resume();
                }
                return this.ctx;
            } catch (e) {
                return null;
            }
        }

        playSwing(heavy = false) {
            const ctx = this._getCtx();
            if (!ctx) return;
            try {
                const now = ctx.currentTime;
                const dur = heavy ? 0.16 : 0.10;
                const bufferSize = Math.floor(ctx.sampleRate * dur);
                const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
                const data = buffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
                }
                const noise = ctx.createBufferSource();
                noise.buffer = buffer;

                const filter = ctx.createBiquadFilter();
                filter.type = 'bandpass';
                filter.frequency.setValueAtTime(heavy ? 320 : 650, now);
                filter.frequency.exponentialRampToValueAtTime(160, now + dur);

                const gain = ctx.createGain();
                gain.gain.setValueAtTime(0.14, now);
                gain.gain.exponentialRampToValueAtTime(0.01, now + dur);

                noise.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                noise.start(now);
            } catch (e) {}
        }

        playHit(isCrit = false) {
            const ctx = this._getCtx();
            if (!ctx) return;
            try {
                const now = ctx.currentTime;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = isCrit ? 'sawtooth' : 'triangle';
                osc.frequency.setValueAtTime(isCrit ? 190 : 140, now);
                osc.frequency.exponentialRampToValueAtTime(42, now + (isCrit ? 0.18 : 0.11));

                gain.gain.setValueAtTime(isCrit ? 0.28 : 0.20, now);
                gain.gain.exponentialRampToValueAtTime(0.005, now + (isCrit ? 0.18 : 0.11));

                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + (isCrit ? 0.19 : 0.12));
            } catch (e) {}
        }

        playBlock() {
            const ctx = this._getCtx();
            if (!ctx) return;
            try {
                const now = ctx.currentTime;
                [780, 1180].forEach((freq, idx) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'square';
                    osc.frequency.setValueAtTime(freq, now);
                    osc.frequency.exponentialRampToValueAtTime(freq * 0.85, now + 0.14);

                    gain.gain.setValueAtTime(idx === 0 ? 0.12 : 0.08, now);
                    gain.gain.exponentialRampToValueAtTime(0.005, now + 0.14);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.15);
                });
            } catch (e) {}
        }

        playVictory() {
            const ctx = this._getCtx();
            if (!ctx) return;
            try {
                const now = ctx.currentTime;
                const notes = [293.66, 369.99, 440.0, 587.33];
                notes.forEach((freq, i) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    const start = now + i * 0.10;
                    osc.frequency.setValueAtTime(freq, start);
                    gain.gain.setValueAtTime(0.14, start);
                    gain.gain.exponentialRampToValueAtTime(0.005, start + 0.25);

                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(start);
                    osc.stop(start + 0.26);
                });
            } catch (e) {}
        }
    }

    Game.SoundFX = new SoundFX();
})(window.LudusGame = window.LudusGame || {});
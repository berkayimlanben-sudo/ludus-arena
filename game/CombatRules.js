(function (Game) {
    class CombatRules {
        static getLaneY(index, teamSize) {
            if (teamSize <= 1) return 355;
            return index === 0 ? 348 : 370;
        }

        static selectBestTarget(self, enemies, allies) {
            const living = (enemies || []).filter(e => e && e.hp > 0);
            if (living.length === 0) return null;
            if (living.length === 1) return living[0];

            const livingAllies = (allies || []).filter(a => a && a !== self && a.hp > 0);

            let best = living[0];
            let bestScore = Infinity;

            for (let i = 0; i < living.length; i++) {
                const e = living[i];
                const dx = Math.abs(e.x - self.x);
                const dy = Math.abs(e.y - self.y);

                const allyEngaging = livingAllies.some(a =>
                    a.opponent === e || (!a.opponent && Math.abs(e.x - a.x) + 15 < dx)
                );

                const engagePenalty = allyEngaging ? (dx > 75 ? 110 : 45) : 0;
                const lanePenalty = dy >= 14 ? 38 : 0;
                const score = dx + engagePenalty + lanePenalty;

                if (score < bestScore) {
                    bestScore = score;
                    best = e;
                }
            }

            return best;
        }

        static computeOverlapPushX(self, others) {
            if (!self || self.hp <= 0 || !others || others.length === 0) return 0;

            let totalPush = 0;
            for (let i = 0; i < others.length; i++) {
                const other = others[i];
                if (!other || other === self || other.hp <= 0) continue;

                // Allies share 2.5D depth lanes and may slip past each other freely on X
                if (other.team === self.team) continue;

                const sameLane = Math.abs(self.y - other.y) < 14;
                const isCurrentTarget = self.opponent === other;

                // Enemies in a different lane who are not the current target do not block passage
                if (!sameLane && !isCurrentTarget) continue;

                const minGap = sameLane ? 38 : 30;
                const dx = self.x - other.x;
                const absDx = Math.abs(dx);

                if (absDx < minGap) {
                    const pushDir = dx > 0 ? 1 : (dx < 0 ? -1 : (self.team === 'left' ? -1 : 1));
                    totalPush += pushDir * (minGap - absDx) * 0.5;
                }
            }

            return totalPush;
        }

        static sortArenaChildren(children, camera, particles) {
            if (!Array.isArray(children)) return children;
            const fighters = [];
            const others = [];

            for (let i = 0; i < children.length; i++) {
                const c = children[i];
                if (c === camera || c === particles) continue;
                if (typeof c.hp === 'number' && typeof c.y === 'number') {
                    fighters.push(c);
                } else {
                    others.push(c);
                }
            }

            fighters.sort((a, b) => {
                const ay = a.y + (a.hp <= 0 ? -0.5 : 0);
                const by = b.y + (b.hp <= 0 ? -0.5 : 0);
                if (ay !== by) return ay - by;
                return a.x - b.x;
            });

            const sorted = [];
            if (camera && children.includes(camera)) sorted.push(camera);
            for (const o of others) sorted.push(o);
            for (const f of fighters) sorted.push(f);
            if (particles && children.includes(particles)) sorted.push(particles);
            return sorted;
        }
    }

    Game.CombatRules = CombatRules;
})(window.LudusGame = window.LudusGame || {});

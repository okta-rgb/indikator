/**
 * Smart Money Concepts (SMC) Engine
 * Menghitung Sweep, BOS/MSS (Body Close), dan Fair Value Gap (FVG)
 */

export class SMCEngine {
    constructor(candles) {
        // Candles berurutan dari lama ke paling baru (OHLCV)
        this.candles = candles; 
    }

    /**
     * Cari Level High & Low Tertinggi/Terendah dari N-candle sebelumnya
     */
    getSwingLevels(lookback = 20) {
        if (this.candles.length < lookback) return null;
        
        const recent = this.candles.slice(-lookback, -1); // Ambil sebelum candle running
        let highest = -Infinity;
        let lowest = Infinity;

        recent.forEach(c => {
            if (c.high > highest) highest = c.high;
            if (c.low < lowest) lowest = c.low;
        });

        return { swingHigh: highest, swingLow: lowest };
    }

    /**
     * Analisis Candle Terhadap Swing High/Low
     * Membedakan Liquidity Sweep (Wick) vs Break of Structure (Body Close)
     */
    analyzeStructure(lookback = 20) {
        const swings = this.getSwingLevels(lookback);
        if (!swings || this.candles.length === 0) return null;

        const current = this.candles[this.candles.length - 1]; // Candle paling baru
        const { swingHigh, swingLow } = swings;

        let result = {
            type: "NEUTRAL", 
            swingHigh,
            swingLow,
            candleHigh: current.high,
            candleLow: current.low,
            candleClose: current.close,
            description: "Harga bergerak di dalam range struktur internal."
        };

        // --- FILTER BULLISH (Atas High) ---
        if (current.high > swingHigh) {
            // Ekor tembus High TAPI Body Close di bawah = LIQUIDITY SWEEP (Potensi Reversal Sell)
            if (current.close <= swingHigh) {
                result.type = "SWEEP_BEARISH";
                result.description = `LIQUIDITY SWEEP! Ekor menembus High (${swingHigh}), tapi Body Close di bawah. Hati-hati jebakan Beli!`;
            } 
            // Body Close di ATAS High = VALID BREAK OF STRUCTURE (BOS / MSS)
            else {
                result.type = "BOS_BULLISH";
                result.description = `VALID BOS/MSS BULLISH! Body Candle Close mantap di atas High (${swingHigh}). Tren berlanjut naik.`;
            }
        }

        // --- FILTER BEARISH (Bawah Low) ---
        else if (current.low < swingLow) {
            // Ekor tembus Low TAPI Body Close di atas = LIQUIDITY SWEEP (Potensi Reversal Buy)
            if (current.close >= swingLow) {
                result.type = "SWEEP_BULLISH";
                result.description = `LIQUIDITY SWEEP! Ekor menembus Low (${swingLow}), tapi Body Close di atas. Hati-hati jebakan Jual!`;
            } 
            // Body Close di BAWAH Low = VALID BREAK OF STRUCTURE (BOS / MSS)
            else {
                result.type = "BOS_BEARISH";
                result.description = `VALID BOS/MSS BEARISH! Body Candle Close mantap di bawah Low (${swingLow}). Tren berlanjut turun.`;
            }
        }

        return result;
    }

    /**
     * Deteksi Fair Value Gap (FVG) / Imbalance 3-Candle Pattern
     */
    findFVG() {
        if (this.candles.length < 3) return [];
        const fvgList = [];

        for (let i = 2; i < this.candles.length; i++) {
            const c1 = this.candles[i - 2];
            const c2 = this.candles[i - 1];
            const c3 = this.candles[i];

            // Bullish FVG: Low candle ke-3 LEBIH TINGGI dari High candle ke-1
            if (c3.low > c1.high) {
                fvgList.push({
                    type: "BULLISH_FVG",
                    top: c3.low,
                    bottom: c1.high,
                    index: i - 1
                });
            }
            // Bearish FVG: High candle ke-3 LEBIH RENDAH dari Low candle ke-1
            else if (c3.high < c1.low) {
                fvgList.push({
                    type: "BEARISH_FVG",
                    top: c1.low,
                    bottom: c3.high,
                    index: i - 1
                });
            }
        }

        return fvgList;
    }
}

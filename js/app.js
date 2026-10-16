/**
 * Main Application Logic - Trade Intelligent
 */

import { CONFIG } from './config.js';
import { SMCEngine } from './logic/smc.js';
import { TwelveDataAPI } from './api/twelvedata.js';
import { getGeminiAnalysis } from './api/gemini.js';

const twelveData = new TwelveDataAPI();

document.addEventListener('DOMContentLoaded', () => {
    initSettings();
    initRealTimeTicker();
    initAnalyzeButton();
});

// Sync input API key dari LocalStorage
function initSettings() {
    const tdInput = document.getElementById('twelvedata-key');
    const geminiInput = document.getElementById('gemini-key');
    const saveBtn = document.getElementById('save-settings-btn');

    if (tdInput) tdInput.value = CONFIG.getApiKey('twelvedata_api_key');
    if (geminiInput) geminiInput.value = CONFIG.getApiKey('gemini_api_key');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            if (tdInput) CONFIG.setApiKey('twelvedata_api_key', tdInput.value);
            if (geminiInput) CONFIG.setApiKey('gemini_api_key', geminiInput.value);
            alert("API Keys berhasil disimpan!");
            initRealTimeTicker(); // Refresh ticker
        });
    }
}

// Update Harga XAUUSD Real-Time di Samping/Panel Utama
async function updateTicker() {
    const priceDisplay = document.getElementById('realtime-price');
    const changeDisplay = document.getElementById('realtime-change');
    
    if (!priceDisplay) return;

    const data = await twelveData.getRealTimePrice("XAU/USD");
    if (!data) {
        priceDisplay.textContent = "API Key Error / Offline";
        return;
    }

    priceDisplay.textContent = `$${data.price.toFixed(2)}`;
    
    if (changeDisplay) {
        const sign = data.isUp ? '+' : '';
        changeDisplay.textContent = `${sign}${data.change.toFixed(2)} (${sign}${data.percentChange.toFixed(2)}%)`;
        changeDisplay.className = data.isUp ? 'text-green-500 font-bold' : 'text-red-500 font-bold';
    }
}

function initRealTimeTicker() {
    updateTicker();
    // Refresh harga tiap 10 detik
    setInterval(updateTicker, 10000);
}

// Tombol Trigger Analisis SMC + AI
function initAnalyzeButton() {
    const btn = document.getElementById('analyze-btn');
    const resultBox = document.getElementById('analysis-result');

    if (!btn) return;

    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = "Menganalisis Market...";

        try {
            const timeframe = document.getElementById('timeframe-select')?.value || CONFIG.defaultTimeframe;
            
            // 1. Ambil Data Candle dari TwelveData
            const candles = await twelveData.getCandles("XAU/USD", timeframe, 50);

            // 2. Jalankan Filter SMC Lokal (Sweep vs Body Close & FVG)
            const smc = new SMCEngine(candles);
            const smcResult = smc.analyzeStructure();
            const fvgs = smc.findFVG();
            const fullSmcData = { ...smcResult, fvgList: fvgs };

            // 3. Minta Sinyal Strict ke Gemini AI
            const aiResult = await getGeminiAnalysis("XAUUSD", timeframe, candles, fullSmcData);

            // 4. Tampilkan Hasil ke UI
            renderAnalysisResult(aiResult, fullSmcData);

        } catch (error) {
            alert(`Error Analisis: ${error.message}`);
        } finally {
            btn.disabled = false;
            btn.textContent = "Jalankan Analisis AI";
        }
    });
}

// Format Tampilan Hasil Sinyal AI
function renderAnalysisResult(ai, smc) {
    const resultContainer = document.getElementById('analysis-result');
    if (!resultContainer) return;

    let badgeColor = "bg-gray-600";
    if (ai.action === "BUY_LIMIT") badgeColor = "bg-green-600";
    if (ai.action === "SELL_LIMIT") badgeColor = "bg-red-600";

    resultContainer.innerHTML = `
        <div class="p-4 rounded-lg bg-gray-800 text-white space-y-3 border border-gray-700">
            <div class="flex justify-between items-center">
                <span class="text-xl font-bold ${badgeColor} px-3 py-1 rounded">${ai.action}</span>
                <span class="text-sm text-gray-400">Keyakinan: ${ai.confidence || 'Tinggi'}</span>
            </div>
            
            <p class="text-sm text-gray-300"><strong>Alasan SMC:</strong> ${ai.reasoning}</p>

            ${ai.action !== "WAIT" ? `
                <div class="grid grid-cols-2 gap-2 text-sm bg-gray-900 p-3 rounded">
                    <div><strong>Entry Limit:</strong> $${ai.entryPrice}</div> <div class="text-red-400"><strong>Stop Loss:</strong> $${ai.stopLoss}</div>
                    <div class="text-green-400"><strong>Take Profit 1:</strong> $${ai.takeProfit1}</div> <div class="text-green-300"><strong>Take Profit 2:</strong> $${ai.takeProfit2}</div>
                </div>
            ` : '<p class="italic text-yellow-400">Market belum memberikan setup valid. Harap tunggu konfirmasi berikutnya.</p>'}

            <div class="text-xs text-gray-500 border-t border-gray-700 pt-2 mt-2">
                <strong>Detail Struktur SMC:</strong> ${smc.description}
            </div>
        </div>
    `;
                                                        }

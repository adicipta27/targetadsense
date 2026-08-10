import { adsenseDoc, setDoc, onSnapshot } from "./firebase.js";

// ======================================
// UTILITY FUNCTIONS (FORMATTING)
// ======================================

function formatRupiah(number) {
    if (isNaN(number) || number === null) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0
    }).format(number);
}

function formatInputNumber(value) {
    if (value === null || value === undefined) return "";
    const raw = value.toString().replace(/\D/g, "");
    if (!raw) return "";
    return new Intl.NumberFormat("id-ID").format(parseInt(raw, 10));
}

function parseRawNumber(str) {
    if (!str) return 0;
    const cleanStr = str.toString().replace(/\D/g, "");
    return parseInt(cleanStr, 10) || 0;
}

// ======================================
// ELEMEN DOM
// ======================================

const elTarget1 = document.getElementById("target1");
const elUang1 = document.getElementById("uang1");
const elTanggal1 = document.getElementById("tanggal1");
const elPersen1 = document.getElementById("persen1");
const elBar1 = document.getElementById("bar1");
const elHasil1 = document.getElementById("hasil1");

const elTarget2 = document.getElementById("target2");
const elUang2 = document.getElementById("uang2");
const elTanggal2 = document.getElementById("tanggal2");
const elPersen2 = document.getElementById("persen2");
const elBar2 = document.getElementById("bar2");
const elHasil2 = document.getElementById("hasil2");

// Pemasukan Ekstra
const elPemasukanEkstra = document.getElementById("pemasukanEkstra");

const elTotalHasil = document.getElementById("totalHasil");
const elProyeksiTotal = document.getElementById("proyeksiTotal");
const elProyeksiDesc = document.getElementById("proyeksiDesc");
const elMonthSelect = document.getElementById("monthSelect");

// Elemen Anggaran Kas (Readonly Input)
const elBudgetTotalKas = document.getElementById("budgetTotalKas");
const elBudgetItemsBody = document.getElementById("budgetItemsBody");
const elSumTotalKas = document.getElementById("sumTotalKas");
const elSumTotalOperasional = document.getElementById("sumTotalOperasional");
const elSumSisaKas = document.getElementById("sumSisaKas");

// Sinking Fund (Tabungan Upgrade Studio)
const elSinkingFundType = document.getElementById("sinkingFundType");
const elSinkingFundVal = document.getElementById("sinkingFundVal");
const elSumSinkingFund = document.getElementById("sumSinkingFund");

// Elemen Persentase Split Kas & Talent
const elPersenKasStudio = document.getElementById("persenKasStudio");
const elPersenTalent = document.getElementById("persenTalent");
const elDispKasPct = document.getElementById("dispKasPct");
const elDispTalentPct = document.getElementById("dispTalentPct");
const elSumKasStudio = document.getElementById("sumKasStudio");
const elSumTotalTalent = document.getElementById("sumTotalTalent");
const elSumGajiPerTalent = document.getElementById("sumGajiPerTalent");

let allFirebaseData = {};
let currentMonthKey = "";
let selectedMonthKey = "";
let isLocalUpdate = false;

// TEMPLATE DEFAULT POS RUTIN
let defaultBudgetItems = [
    { name: "sedekah 5%", val: 0, isAutoSedekah: true },
    { name: "listrik", val: 600000 },
    { name: "internet", val: 334230 },
    { name: "Capcut", val: 45000 },
    { name: "CANVA", val: 10000 }
];

let currentBudgetItems = JSON.parse(JSON.stringify(defaultBudgetItems));

// ======================================
// FLATPICKR & MONTH SELECTOR (PERBAIKAN TANGGAL)
// ======================================

const fp1 = flatpickr("#tanggal1", { 
    locale: "id", 
    dateFormat: "Y-m-d", 
    defaultDate: "today", 
    allowInput: true, 
    clickOpens: true, 
    onChange: () => saveDataAndCalculate() 
});

const fp2 = flatpickr("#tanggal2", { 
    locale: "id", 
    dateFormat: "Y-m-d", 
    defaultDate: "today", 
    allowInput: true, 
    clickOpens: true, 
    onChange: () => saveDataAndCalculate() 
});

function initMonthSelector() {
    const now = new Date();
    const curY = now.getFullYear();
    const curM = String(now.getMonth() + 1).padStart(2, '0');
    currentMonthKey = `${curY}-${curM}`;
    if (!selectedMonthKey) selectedMonthKey = currentMonthKey;

    elMonthSelect.innerHTML = "";
    for (let i = 0; i < 6; i++) {
        const d = new Date(curY, now.getMonth() - i, 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${yyyy}-${mm}`;
        const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

        const opt = document.createElement("option");
        opt.value = key;
        opt.textContent = (i === 0) ? `${label} (Aktif)` : label;
        elMonthSelect.appendChild(opt);
    }
    elMonthSelect.value = selectedMonthKey;
}

if (elMonthSelect) {
    elMonthSelect.addEventListener("change", (e) => {
        selectedMonthKey = e.target.value;
        applySelectedMonthData();
    });
}

// ======================================
// LOGIKA PERSENTASE SPLIT (100% TOTAL)
// ======================================

if (elPersenKasStudio) {
    elPersenKasStudio.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;
        
        elPersenKasStudio.value = val;
        if (elPersenTalent) elPersenTalent.value = 100 - val;
        
        calculateBudget();
        saveDataAndCalculate();
    });
}

if (elPersenTalent) {
    elPersenTalent.addEventListener("input", (e) => {
        let val = parseFloat(e.target.value);
        if (isNaN(val)) val = 0;
        if (val < 0) val = 0;
        if (val > 100) val = 100;

        elPersenTalent.value = val;
        if (elPersenKasStudio) elPersenKasStudio.value = 100 - val;

        calculateBudget();
        saveDataAndCalculate();
    });
}

// EVENT LISTENER SINKING FUND TYPE
if (elSinkingFundType) {
    elSinkingFundType.addEventListener("change", () => {
        if (elSinkingFundVal) elSinkingFundVal.value = "";
        calculateBudget();
        saveDataAndCalculate();
    });
}

// ======================================
// LOGIKA ANGGARAN & DEDUKSI POS
// ======================================

function getSedekahValues(totalKas) {
    if (totalKas <= 0) return { raw: 0, rounded: 0 };
    const raw5pct = Math.round(totalKas * 0.05);
    const rounded = Math.ceil(raw5pct / 10000) * 10000;
    return { raw: raw5pct, rounded: rounded };
}

window.renderBudgetTable = function() {
    if (!elBudgetItemsBody) return;
    elBudgetItemsBody.innerHTML = "";
    const totalKas = parseRawNumber(elBudgetTotalKas ? elBudgetTotalKas.value : 0);

    currentBudgetItems.forEach((item, index) => {
        const tr = document.createElement("tr");
        const isSedekah = item.isAutoSedekah || (item.name && item.name.toLowerCase().includes("sedekah"));

        let displayVal = formatInputNumber(item.val);
        if (isSedekah) {
            const sedekah = getSedekahValues(totalKas);
            item.rawVal = sedekah.raw;
            item.val = sedekah.rounded;
            displayVal = totalKas > 0 ? `${formatInputNumber(item.rawVal)} (${formatInputNumber(item.val)})` : "0 (0)";
        }

        tr.innerHTML = `
            <td>
              <input type="text" value="${item.name}" ${isSedekah ? 'disabled' : ''} oninput="updateBudgetItemName(${index}, this.value)" placeholder="Nama POS...">
            </td>
            <td>
              <input type="text" value="${displayVal}" ${isSedekah ? 'disabled' : ''} oninput="updateBudgetItemVal(${index}, this.value)" placeholder="0">
            </td>
            <td>${!isSedekah ? `<button class="btn-del" onclick="deleteBudgetItem(${index})">✕</button>` : ''}</td>
        `;
        elBudgetItemsBody.appendChild(tr);
    });
    calculateBudget();
};

window.addBudgetItem = function() {
    currentBudgetItems.push({ name: "POS Baru", val: 0 });
    renderBudgetTable();
    saveDataAndCalculate();
};

window.deleteBudgetItem = function(index) {
    currentBudgetItems.splice(index, 1);
    renderBudgetTable();
    saveDataAndCalculate();
};

window.updateBudgetItemName = function(index, val) {
    currentBudgetItems[index].name = val;
    saveDataAndCalculate();
};

window.updateBudgetItemVal = function(index, valStr) {
    currentBudgetItems[index].val = parseRawNumber(valStr);
    calculateBudget();
    saveDataAndCalculate();
};

window.calculateBudget = function() {
    const totalKas = parseRawNumber(elBudgetTotalKas ? elBudgetTotalKas.value : 0);

    // Update POS Sedekah 5%
    currentBudgetItems.forEach((item, index) => {
        if (item.isAutoSedekah || (item.name && item.name.toLowerCase().includes("sedekah"))) {
            const sedekah = getSedekahValues(totalKas);
            item.rawVal = sedekah.raw;
            item.val = sedekah.rounded;

            if (elBudgetItemsBody && elBudgetItemsBody.children[index]) {
                const inputNominal = elBudgetItemsBody.children[index].querySelector("td:nth-child(2) input");
                if (inputNominal) {
                    inputNominal.value = totalKas > 0 
                        ? `${formatInputNumber(item.rawVal)} (${formatInputNumber(item.val)})` 
                        : "0 (0)";
                }
            }
        }
    });

    let totalOperasional = 0;
    currentBudgetItems.forEach(item => {
        totalOperasional += (item.val || 0);
    });

    const sisaKasAwal = Math.max(0, totalKas - totalOperasional);

    // LOGIKA SINKING FUND (JIKA TERSEDIA DI DOM)
    const sfType = elSinkingFundType ? elSinkingFundType.value : "persen";
    let nominalSinkingFund = 0;

    if (sfType === "persen") {
        let pct = parseFloat(elSinkingFundVal ? elSinkingFundVal.value : 0) || 0;
        pct = Math.min(100, Math.max(0, pct));
        nominalSinkingFund = Math.round(sisaKasAwal * (pct / 100));
    } else {
        nominalSinkingFund = parseRawNumber(elSinkingFundVal ? elSinkingFundVal.value : 0);
    }
    nominalSinkingFund = Math.min(sisaKasAwal, nominalSinkingFund);

    const sisaKasBersih = Math.max(0, sisaKasAwal - nominalSinkingFund);

    // Ambil Persentase Split
    let pKas = parseFloat(elPersenKasStudio ? elPersenKasStudio.value : 20) || 0;
    pKas = Math.min(100, Math.max(0, pKas));
    const pTalent = 100 - pKas;

    // Hitung Nominal Split dari Sisa Kas Bersih
    const nominalKasStudio = Math.round(sisaKasBersih * (pKas / 100));
    const nominalTotalTalent = sisaKasBersih - nominalKasStudio;
    const nominalPerTalent = Math.round(nominalTotalTalent / 2);

    // Update UI Tampilan Pembukuan
    if (elSumTotalKas) elSumTotalKas.textContent = formatRupiah(totalKas);
    if (elSumTotalOperasional) elSumTotalOperasional.textContent = "- " + formatRupiah(totalOperasional);
    if (elSumSisaKas) elSumSisaKas.textContent = formatRupiah(sisaKasAwal);
    if (elSumSinkingFund) elSumSinkingFund.textContent = formatRupiah(nominalSinkingFund);

    if (elDispKasPct) elDispKasPct.textContent = `${pKas}%`;
    if (elDispTalentPct) elDispTalentPct.textContent = `${pTalent}%`;

    if (elSumKasStudio) elSumKasStudio.textContent = formatRupiah(nominalKasStudio);
    if (elSumTotalTalent) elSumTotalTalent.textContent = formatRupiah(nominalTotalTalent);
    if (elSumGajiPerTalent) elSumGajiPerTalent.textContent = `${formatRupiah(nominalPerTalent)} / orang`;
};

// ======================================
// LOGIKA TARGET ADSENSE & PEMASUKAN EKSTRA
// ======================================

function calculateChannel(target, uang, selectedDateStr) {
    const selectedDate = selectedDateStr ? new Date(selectedDateStr) : new Date();
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    const currentDay = Math.min(Math.max(1, selectedDate.getDate()), totalDaysInMonth);
    const remainingDays = Math.max(0, totalDaysInMonth - currentDay);

    const sisaTarget = Math.max(0, target - uang);
    const persen = target > 0 ? Math.min(100, Math.round((uang / target) * 100)) : 0;
    
    const avgDailyCurrent = currentDay > 0 ? Math.round(uang / currentDay) : 0;
    const targetSisaHarian = remainingDays > 0 ? Math.round(sisaTarget / remainingDays) : 0;

    const projectedChannel = Math.round(uang + (avgDailyCurrent * remainingDays));
    const projectedPctChannel = target > 0 ? Math.round((projectedChannel / target) * 100) : 0;

    return { 
        sisaTarget, 
        persen, 
        avgDailyCurrent, 
        targetSisaHarian, 
        remainingDays, 
        projectedChannel, 
        projectedPctChannel 
    };
}

function updateUI() {
    const target1 = parseRawNumber(elTarget1 ? elTarget1.value : 0);
    const uang1 = parseRawNumber(elUang1 ? elUang1.value : 0);
    const date1 = elTanggal1 ? elTanggal1.value : "";

    const target2 = parseRawNumber(elTarget2 ? elTarget2.value : 0);
    const uang2 = parseRawNumber(elUang2 ? elUang2.value : 0);
    const date2 = elTanggal2 ? elTanggal2.value : "";

    const pemEkstra = parseRawNumber(elPemasukanEkstra ? elPemasukanEkstra.value : 0);

    // --- CHANNEL 1 (YOUTUBE ADINOKI) ---
    const res1 = calculateChannel(target1, uang1, date1);
    if (elPersen1) elPersen1.textContent = `${res1.persen}%`;
    if (elBar1) elBar1.style.width = `${res1.persen}%`;
    if (elHasil1) {
        elHasil1.innerHTML = `
            <div class="hasil-row">
                <span>Sisa Target:</span>
                <span class="val-blue">${formatRupiah(res1.sisaTarget)}</span>
            </div>
            <div class="hasil-row">
                <span>Rata-Rata Harian Saat Ini:</span>
                <span class="val-blue">${formatRupiah(res1.avgDailyCurrent)}/hari</span>
            </div>
            <div class="hasil-row">
                <span>Target Sisa Harian (${res1.remainingDays} hari lagi):</span>
                <span class="val-blue">${formatRupiah(res1.targetSisaHarian)}/hari</span>
            </div>
            <div class="hasil-row">
                <span>🚀 Proyeksi Akhir Bulan:</span>
                <span class="val-blue bold">${formatRupiah(res1.projectedChannel)} (${res1.projectedPctChannel}%)</span>
            </div>
            <div class="status-badge ${res1.projectedChannel >= target1 ? 'status-ok' : 'status-warn'}">
                ${res1.projectedChannel >= target1 ? '👍 Status Aman (On Track)' : '⚠️ Perlu Ditingkatkan'}
            </div>
        `;
    }

    // --- CHANNEL 2 (YOUTUBE ADINOKI REACTION) ---
    const res2 = calculateChannel(target2, uang2, date2);
    if (elPersen2) elPersen2.textContent = `${res2.persen}%`;
    if (elBar2) elBar2.style.width = `${res2.persen}%`;
    if (elHasil2) {
        elHasil2.innerHTML = `
            <div class="hasil-row">
                <span>Sisa Target:</span>
                <span class="val-blue">${formatRupiah(res2.sisaTarget)}</span>
            </div>
            <div class="hasil-row">
                <span>Rata-Rata Harian Saat Ini:</span>
                <span class="val-blue">${formatRupiah(res2.avgDailyCurrent)}/hari</span>
            </div>
            <div class="hasil-row">
                <span>Target Sisa Harian (${res2.remainingDays} hari lagi):</span>
                <span class="val-blue">${formatRupiah(res2.targetSisaHarian)}/hari</span>
            </div>
            <div class="hasil-row">
                <span>🚀 Proyeksi Akhir Bulan:</span>
                <span class="val-pink bold">${formatRupiah(res2.projectedChannel)} (${res2.projectedPctChannel}%)</span>
            </div>
            <div class="status-badge ${res2.projectedChannel >= target2 ? 'status-ok' : 'status-warn'}">
                ${res2.projectedChannel >= target2 ? '👍 Status Aman (On Track)' : '⚠️ Perlu Ditingkatkan'}
            </div>
        `;
    }

    // --- TOTAL SEMUA CHANNEL + PEMASUKAN EKSTRA ---
    const totalTarget = target1 + target2;
    const totalUangAdsense = uang1 + uang2;
    const totalUangTerkumpul = totalUangAdsense + pemEkstra;
    const totalProgress = totalTarget > 0 ? Math.round((totalUangAdsense / totalTarget) * 100) : 0;

    if (elTotalHasil) {
        elTotalHasil.innerHTML = `
            <div class="hasil-row">
                <span>Total Target Bulanan:</span>
                <span class="val-green bold">${formatRupiah(totalTarget)}</span>
            </div>
            <div class="hasil-row">
                <span>Total AdSense Terkumpul:</span>
                <span class="val-green bold">${formatRupiah(totalUangAdsense)}</span>
            </div>
            <div class="hasil-row">
                <span>Pemasukan Ekstra (Sponsor/Event):</span>
                <span class="val-green bold">${formatRupiah(pemEkstra)}</span>
            </div>
            <div class="hasil-row" style="border-top: 1px dashed #ccc; padding-top: 6px; margin-top: 6px;">
                <span>Total Uang Terkumpul:</span>
                <span class="val-green bold" style="font-size: 1.1em;">${formatRupiah(totalUangTerkumpul)}</span>
            </div>
            <div class="hasil-row">
                <span>Total Progress AdSense:</span>
                <span class="val-green bold">${totalProgress}%</span>
            </div>
        `;
    }

    // --- PROYEKSI TOTAL AKHIR BULAN ---
    const totalProjected = res1.projectedChannel + res2.projectedChannel;
    const totalProjectedPct = totalTarget > 0 ? Math.round((totalProjected / totalTarget) * 100) : 0;

    if (elProyeksiTotal) elProyeksiTotal.textContent = formatRupiah(totalProjected);
    
    if (elProyeksiDesc) {
        const isTerlampaui = totalProjected >= totalTarget;
        const statusIcon = isTerlampaui ? '🚀 Terlampaui' : '⚠️ Kurang Target';
        elProyeksiDesc.textContent = `Berdasarkan tren harian saat ini, estimasi total gabungan AdSense di akhir bulan mencapai ${totalProjectedPct}% dari target (${statusIcon}).`;
    }

    // Auto-sync nilai Total Uang Terkumpul ke input Readonly Kas
    if (elBudgetTotalKas) {
        elBudgetTotalKas.value = formatInputNumber(totalUangTerkumpul);
        calculateBudget();
    }
}

// ======================================
// MANAJEMEN DATA FIREBASE
// ======================================

function applySelectedMonthData() {
    [elTarget1, elUang1, elTanggal1, elTarget2, elUang2, elTanggal2, elPemasukanEkstra, elSinkingFundType, elSinkingFundVal, elPersenKasStudio, elPersenTalent].forEach(el => {
        if (el) el.disabled = false;
    });

    const monthData = allFirebaseData[selectedMonthKey] || {};

    if (elTarget1 && document.activeElement !== elTarget1) elTarget1.value = monthData.target1 ? formatInputNumber(monthData.target1) : "";
    if (elUang1 && document.activeElement !== elUang1) elUang1.value = monthData.uang1 ? formatInputNumber(monthData.uang1) : "";
    if (monthData.tanggal1 && fp1) fp1.setDate(monthData.tanggal1, false);

    if (elTarget2 && document.activeElement !== elTarget2) elTarget2.value = monthData.target2 ? formatInputNumber(monthData.target2) : "";
    if (elUang2 && document.activeElement !== elUang2) elUang2.value = monthData.uang2 ? formatInputNumber(monthData.uang2) : "";
    if (monthData.tanggal2 && fp2) fp2.setDate(monthData.tanggal2, false);

    if (elPemasukanEkstra && document.activeElement !== elPemasukanEkstra) {
        elPemasukanEkstra.value = monthData.pemasukanEkstra ? formatInputNumber(monthData.pemasukanEkstra) : "";
    }

    // Load Sinking Fund (jika ada)
    if (elSinkingFundType) elSinkingFundType.value = monthData.sinkingFundType || "persen";
    if (elSinkingFundVal && document.activeElement !== elSinkingFundVal) {
        const sfVal = monthData.sinkingFundVal !== undefined ? monthData.sinkingFundVal : "";
        elSinkingFundVal.value = (monthData.sinkingFundType === "nominal") ? formatInputNumber(sfVal) : sfVal;
    }

    // Load Persentase Split
    const loadedPKas = monthData.persenKasStudio !== undefined ? monthData.persenKasStudio : 20;
    if (elPersenKasStudio) elPersenKasStudio.value = loadedPKas;
    if (elPersenTalent) elPersenTalent.value = 100 - loadedPKas;

    currentBudgetItems = monthData.budgetItems ? [...monthData.budgetItems] : JSON.parse(JSON.stringify(defaultBudgetItems));

    renderBudgetTable();
    updateUI();
}

let saveTimeout;
function saveDataAndCalculate() {
    updateUI();

    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(async () => {
        isLocalUpdate = true;
        try {
            const dataToSave = {
                ...allFirebaseData,
                [selectedMonthKey]: {
                    target1: parseRawNumber(elTarget1 ? elTarget1.value : 0),
                    uang1: parseRawNumber(elUang1 ? elUang1.value : 0),
                    tanggal1: elTanggal1 ? elTanggal1.value : "",
                    target2: parseRawNumber(elTarget2 ? elTarget2.value : 0),
                    uang2: parseRawNumber(elUang2 ? elUang2.value : 0),
                    tanggal2: elTanggal2 ? elTanggal2.value : "",
                    pemasukanEkstra: parseRawNumber(elPemasukanEkstra ? elPemasukanEkstra.value : 0),
                    budgetTotalKas: parseRawNumber(elBudgetTotalKas ? elBudgetTotalKas.value : 0),
                    sinkingFundType: elSinkingFundType ? elSinkingFundType.value : "persen",
                    sinkingFundVal: (elSinkingFundType && elSinkingFundType.value === "nominal")
                        ? parseRawNumber(elSinkingFundVal ? elSinkingFundVal.value : 0)
                        : (parseFloat(elSinkingFundVal ? elSinkingFundVal.value : 0) || 0),
                    persenKasStudio: parseFloat(elPersenKasStudio ? elPersenKasStudio.value : 20) || 0,
                    budgetItems: currentBudgetItems,
                    updatedAt: new Date().toISOString()
                }
            };
            await setDoc(adsenseDoc, dataToSave, { merge: true });
        } catch (error) {
            console.error("Gagal menyimpan ke Firebase:", error);
        } finally {
            setTimeout(() => { isLocalUpdate = false; }, 500);
        }
    }, 400);
}

function handleInputChange(e) {
    if (e && e.target && e.target.type === "text" && !e.target.id.includes("tanggal")) {
        if (e.target.id === "sinkingFundVal" && elSinkingFundType && elSinkingFundType.value === "persen") {
            // Abaikan format rupiah untuk persentase
        } else {
            e.target.value = formatInputNumber(e.target.value);
        }
    }
    saveDataAndCalculate();
}

// Menghubungkan event listener pada semua input termasuk tanggal (input & change)
[elTarget1, elUang1, elTanggal1, elTarget2, elUang2, elTanggal2, elPemasukanEkstra, elSinkingFundVal].forEach(input => {
    if (input) {
        input.addEventListener("input", handleInputChange);
        input.addEventListener("change", handleInputChange);
    }
});

initMonthSelector();

onSnapshot(adsenseDoc, (docSnap) => {
    if (docSnap.exists()) {
        allFirebaseData = docSnap.data();
        if (!isLocalUpdate) applySelectedMonthData();
    } else {
        updateUI();
    }
});

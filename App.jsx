import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Calendar, Archive, FileSpreadsheet, Table, CheckCircle2, Eye, EyeOff, Copy } from 'lucide-react';

const SalaryTracker = () => {
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState({
    hourlyRate: 200,
    overtimeRate1: 1.34,
    overtimeRate2: 1.67,
    settlementDay: 25
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSalary, setShowSalary] = useState(true); // 薪資隱藏開關
  const [lastAddedInfo, setLastAddedInfo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterMonth, setFilterMonth] = useState('all');
  
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '18:00',
    breakMinutes: 60,
    note: ''
  });

  useEffect(() => {
    const savedRecords = localStorage.getItem('salary_records');
    const savedSettings = localStorage.getItem('salary_settings');
    if (savedRecords) setRecords(JSON.parse(savedRecords));
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  const saveData = (newRecords, newSettings) => {
    localStorage.setItem('salary_records', JSON.stringify(newRecords || records));
    localStorage.setItem('salary_settings', JSON.stringify(newSettings || settings));
  };

  const calculateSalary = (recordData) => {
    const { checkIn, checkOut, breakMinutes, note } = recordData;
    if (note === '病假') return { regularHours: 0, overtime1: 0, overtime2: 0, overtimeTotal: 0, salary: 0 };
    
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - breakMinutes;
    const totalHours = Math.max(0, totalMinutes / 60);

    const regularHours = Math.min(totalHours, 8);
    const overtimeTotal = Math.max(totalHours - 8, 0);
    const overtime1 = Math.min(overtimeTotal, 2);
    const overtime2 = Math.max(overtimeTotal - 2, 0);

    let regularPay = regularHours * settings.hourlyRate;
    const overtimePay = (overtime1 * settings.hourlyRate * settings.overtimeRate1) + 
                       (overtime2 * settings.hourlyRate * settings.overtimeRate2);
    
    if (note === '雙薪') regularPay += (8 * settings.hourlyRate);

    return {
      regularHours: Number(regularHours.toFixed(2)),
      overtimeTotal: Number(overtimeTotal.toFixed(2)),
      overtime1: Number(overtime1.toFixed(2)),
      overtime2: Number(overtime2.toFixed(2)),
      salary: Math.round(regularPay + overtimePay)
    };
  };

  const addRecord = () => {
    const calc = calculateSalary(newRecord);
    const record = { id: Date.now(), ...newRecord, ...calc };
    const updatedRecords = [record, ...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(updatedRecords);
    saveData(updatedRecords, settings);
    setLastAddedInfo(`已成功新增：${newRecord.date}`);
    setTimeout(() => setLastAddedInfo(null), 3000);
  };

  // 複製到 Google Sheets 功能
  const copyForSheets = () => {
    const filtered = records.filter(r => filterMonth === 'all' || r.date.startsWith(filterMonth));
    let tsv = "日期\t上班\t下班\t正常工時\t1.34加班\t1.67加班\t總加班\t薪資\t備註\n";
    filtered.forEach(r => {
      tsv += `${r.date}\t${r.checkIn}\t${r.checkOut}\t${r.regularHours}\t${r.overtime1}\t${r.overtime2}\t${r.overtimeTotal}\t${r.salary}\t${r.note}\n`;
    });
    navigator.clipboard.writeText(tsv);
    alert('已複製表格內容！請直接到 Google Sheets 貼上即可。');
    setShowExportModal(false);
  };

  const filteredRecords = records.filter(r => filterMonth === 'all' || r.date.startsWith(filterMonth));
  
  // 計算加總
  const totals = filteredRecords.reduce((acc, r) => ({
    salary: acc.salary + r.salary,
    ot1: acc.ot1 + r.overtime1,
    ot2: acc.ot2 + r.overtime2,
    otTotal: acc.otTotal + r.overtimeTotal
  }), { salary: 0, ot1: 0, ot2: 0, otTotal: 0 });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-32">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-800">💰 薪資出勤系統</h1>
          <button onClick={() => setShowSettings(!showSettings)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition">
            {showSettings ? '✖ 關閉設定' : '⚙️ 設定'}
          </button>
        </div>

        {showSettings && (
          <div className="p-4 bg-blue-50 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 border border-blue-100">
            <label className="block">時薪：<input type="number" value={settings.hourlyRate} onChange={e => {const s={...settings, hourlyRate:Number(e.target.value)}; setSettings(s); saveData(null, s);}} className="p-2 rounded border"/></label>
          </div>
        )}

        {/* 新增紀錄 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <input type="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="p-2 bg-slate-50 rounded border"/>
            <input type="time" value={newRecord.checkIn} onChange={e => setNewRecord({...newRecord, checkIn: e.target.value})} className="p-2 bg-slate-50 rounded border"/>
            <input type="time" value={newRecord.checkOut} onChange={e => setNewRecord({...newRecord, checkOut: e.target.value})} className="p-2 bg-slate-50 rounded border"/>
            <select value={newRecord.note} onChange={e => setNewRecord({...newRecord, note: e.target.value})} className="p-2 bg-slate-50 rounded border">
              <option value="">正常</option><option value="病假">病假</option><option value="雙薪">雙薪</option>
            </select>
            <button onClick={addRecord} className="bg-blue-600 text-white rounded-lg font-bold">新增紀錄</button>
          </div>
          {lastAddedInfo && <div className="mt-2 text-emerald-600 text-sm animate-bounce">{lastAddedInfo}</div>}
        </div>

        {/* 紀錄清單 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="bg-white border rounded p-1">
              <option value="all">所有月份</option>
              {[...new Set(records.map(r => r.date.substring(0, 7)))].map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <button onClick={() => setShowExportModal(true)} className="text-emerald-600 flex items-center gap-1 font-bold"><Download size={16}/> 匯出報表</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-xs text-slate-500 border-b">
                  <th className="p-4">日期</th><th className="p-4">正常</th><th className="p-4">1.34/1.67</th><th className="p-4">總加班</th><th className="p-4">薪資</th><th className="p-4">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => (
                  <tr key={r.id} className="border-b hover:bg-slate-50">
                    <td className="p-4 text-sm">{r.date}</td>
                    <td className="p-4 text-sm">{r.regularHours}h</td>
                    <td className="p-4 text-sm text-orange-500 font-medium">{r.overtime1}h / {r.overtime2}h</td>
                    <td className="p-4 text-sm font-bold text-orange-600">{r.overtimeTotal}h</td>
                    <td className="p-4 text-sm font-bold text-emerald-600">NT$ {r.salary.toLocaleString()}</td>
                    <td className="p-4"><button onClick={() => {setDeleteTarget(r); setShowDeleteModal(true)}} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
                {/* 總計列 */}
                <tr className="bg-slate-100 font-black text-slate-700">
                  <td className="p-4">當月總計</td>
                  <td className="p-4">-</td>
                  <td className="p-4 text-orange-600">{totals.ot1.toFixed(2)}h / {totals.ot2.toFixed(2)}h</td>
                  <td className="p-4 text-orange-700">{totals.otTotal.toFixed(2)}h</td>
                  <td className="p-4 text-emerald-700">NT$ {totals.salary.toLocaleString()}</td>
                  <td className="p-4"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 底部薪資浮動欄 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">
              {filterMonth === 'all' ? '所有紀錄' : `${filterMonth} 月`} 預估實領總額
            </div>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-emerald-600 tracking-tight">
                {showSalary ? `NT$ ${totals.salary.toLocaleString()}` : 'NT$ ********'}
              </span>
              <button onClick={() => setShowSalary(!showSalary)} className="p-2 hover:bg-slate-100 rounded-full transition">
                {showSalary ? <EyeOff size={20} className="text-slate-400"/> : <Eye size={20} className="text-slate-400"/>}
              </button>
            </div>
          </div>
          <div className="hidden md:block text-right">
             <div className="text-xs text-slate-400 font-bold">總加班時數</div>
             <div className="text-lg font-bold text-orange-600">{totals.otTotal.toFixed(2)} 小時</div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black mb-6 text-center">選擇匯出方式</h3>
            <div className="space-y-4">
              <button onClick={copyForSheets} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-emerald-700 transition">
                <Copy size={20}/> 複製到 Google Sheets
              </button>
              <button onClick={() => setShowExportModal(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition">取消</button>
            </div>
            <p className="mt-4 text-xs text-slate-400 text-center">※ 點擊複製後，直接在 Sheets 按 Ctrl+V 貼上即可。</p>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full">
            <h3 className="font-bold mb-4 text-center">確定要刪除這筆紀錄嗎？</h3>
            <div className="flex gap-2">
              <button onClick={() => {
                const u = records.filter(r => r.id !== deleteTarget.id);
                setRecords(u); saveData(u, null); setShowDeleteModal(false);
              }} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold">刪除</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTracker;

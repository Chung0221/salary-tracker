import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Calendar, Archive, FileSpreadsheet, Table, CheckCircle2, Eye, EyeOff, Copy, Clock, Coffee } from 'lucide-react';

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
  const [showSalary, setShowSalary] = useState(true);
  const [lastAddedInfo, setLastAddedInfo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filterMonth, setFilterMonth] = useState('all');
  
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    checkIn: '09:00',
    checkOut: '18:00',
    breakMinutes: 60, // 預設 60 分鐘
    note: ''
  });

  useEffect(() => {
    const savedRecords = localStorage.getItem('salary_records');
    const savedSettings = localStorage.getItem('salary_settings');
    if (savedRecords) {
        try {
            setRecords(JSON.parse(savedRecords));
        } catch(e) { setRecords([]); }
    }
    if (savedSettings) setSettings(JSON.parse(savedSettings));
  }, []);

  const saveData = (newRecords, newSettings) => {
    if(newRecords) localStorage.setItem('salary_records', JSON.stringify(newRecords));
    if(newSettings) localStorage.setItem('salary_settings', JSON.stringify(newSettings));
  };

  const calculateSalary = (recordData) => {
    const { checkIn, checkOut, breakMinutes, note } = recordData;
    if (note === '病假') return { regularHours: 0, overtime1: 0, overtime2: 0, overtimeTotal: 0, salary: 0 };
    
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    
    // 計算總分鐘數並扣除休息時間
    const totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (Number(breakMinutes) || 0);
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
      regularHours: Number(regularHours.toFixed(2)) || 0,
      overtimeTotal: Number(overtimeTotal.toFixed(2)) || 0,
      overtime1: Number(overtime1.toFixed(2)) || 0,
      overtime2: Number(overtime2.toFixed(2)) || 0,
      salary: Math.round(regularPay + overtimePay) || 0
    };
  };

  const addRecord = () => {
    const calc = calculateSalary(newRecord);
    const record = { id: Date.now(), ...newRecord, ...calc };
    const updatedRecords = [record, ...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(updatedRecords);
    saveData(updatedRecords, null);
    setLastAddedInfo(`已新增：${newRecord.date}`);
    setTimeout(() => setLastAddedInfo(null), 3000);
  };

  const filteredRecords = records.filter(r => filterMonth === 'all' || r.date.startsWith(filterMonth));
  
  const totals = filteredRecords.reduce((acc, r) => ({
    salary: acc.salary + (Number(r.salary) || 0),
    ot1: acc.ot1 + (Number(r.overtime1) || 0),
    ot2: acc.ot2 + (Number(r.overtime2) || 0),
    otTotal: acc.otTotal + (Number(r.overtimeTotal) || 0)
  }), { salary: 0, ot1: 0, ot2: 0, otTotal: 0 });

  const copyForSheets = () => {
    if (filteredRecords.length === 0) return alert('目前沒有資料可以匯出');
    const dates = filteredRecords.map(r => r.date).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    let tsv = `薪資報表區間: ${startDate} 至 ${endDate}\n\n`;
    tsv += "日期\t上班\t下班\t休息(分)\t正常工時\t1.34加班\t1.67加班\t總加班\t薪資\t備註\n";
    [...filteredRecords].reverse().forEach(r => {
      tsv += `${r.date}\t${r.checkIn}\t${r.checkOut}\t${r.breakMinutes}\t${r.regularHours}\t${r.overtime1}\t${r.overtime2}\t${r.overtimeTotal}\t${r.salary}\t${r.note}\n`;
    });
    tsv += `\n當月總計\t-\t-\t-\t-\t${totals.ot1.toFixed(2)}\t${totals.ot2.toFixed(2)}\t${totals.otTotal.toFixed(2)}\t${totals.salary}\t-\n`;
    navigator.clipboard.writeText(tsv);
    alert('已複製報表內容！');
    setShowExportModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-40 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">💰 薪資出勤系統</h1>
          <button onClick={() => setShowSettings(!showSettings)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition font-bold text-sm">⚙️ 系統設定</button>
        </div>

        {showSettings && (
          <div className="p-4 bg-blue-50 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 border border-blue-100 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-blue-600">目前時薪 (NT$)：</span>
              <input type="number" value={settings.hourlyRate} onChange={e => {const s={...settings, hourlyRate:Number(e.target.value)}; setSettings(s); saveData(null, s);}} className="p-2 rounded-lg border border-blue-200 focus:outline-blue-500 bg-white"/>
            </div>
          </div>
        )}

        {/* 新增紀錄區 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">日期</span>
              <input type="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-blue-500"/>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">上班 (15m間隔)</span>
              <input type="time" step="900" value={newRecord.checkIn} onChange={e => setNewRecord({...newRecord, checkIn: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-blue-500"/>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">下班 (15m間隔)</span>
              <input type="time" step="900" value={newRecord.checkOut} onChange={e => setNewRecord({...newRecord, checkOut: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-blue-500"/>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1"><Coffee size={12}/> 休息</span>
              <select value={newRecord.breakMinutes} onChange={e => setNewRecord({...newRecord, breakMinutes: Number(e.target.value)})} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-blue-500">
                <option value={60}>60 分鐘</option>
                <option value={0}>無休息</option>
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">類別</span>
              <select value={newRecord.note} onChange={e => setNewRecord({...newRecord, note: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200 focus:outline-blue-500">
                <option value="">正常上班</option><option value="病假">病假</option><option value="雙薪">雙薪</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={addRecord} className="w-full bg-blue-600 text-white py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-lg shadow-blue-100 active:scale-95">新增紀錄</button>
            </div>
          </div>
          {lastAddedInfo && <div className="mt-3 text-emerald-600 text-sm font-bold flex items-center gap-1 animate-in slide-in-from-left-2"><CheckCircle2 size={16}/> {lastAddedInfo}</div>}
        </div>

        {/* 歷史紀錄表格 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-sm font-bold">
            <div className="flex items-center gap-2 text-slate-500"><Calendar size={16} /><span>歷史清單</span></div>
            <button onClick={() => setShowExportModal(true)} className="text-emerald-600 flex items-center gap-1 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg transition"><Download size={16}/> 匯出報表</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left whitespace-nowrap">
              <thead>
                <tr className="text-[11px] text-slate-400 border-b bg-slate-50/30 uppercase tracking-tighter font-black">
                  <th className="p-4">日期 / 時間 (休息)</th><th className="p-4">正常</th><th className="p-4 text-center">1.34 / 1.67 加班</th><th className="p-4">總加班</th><th className="p-4">薪資估算</th><th className="p-4 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map(r => (
                  <tr key={r.id} className="border-b hover:bg-slate-50/80 transition group">
                    <td className="p-4">
                      <div className="text-sm font-bold text-slate-700">{r.date}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock size={10}/> {r.checkIn}-{r.checkOut} ({r.breakMinutes === 0 ? '無休息' : '休60m'})
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600 font-medium">{Number(r.regularHours || 0).toFixed(1)}h</td>
                    <td className="p-4 text-center"><div className="flex items-center justify-center gap-2"><span className="text-orange-500 font-bold bg-orange-50 px-1.5 py-0.5 rounded text-xs">{Number(r.overtime1 || 0).toFixed(2)}h</span><span className="text-orange-500 font-bold bg-orange-50 px-1.5 py-0.5 rounded text-xs">{Number(r.overtime2 || 0).toFixed(2)}h</span></div></td>
                    <td className="p-4 text-sm font-black text-orange-600">{Number(r.overtimeTotal || 0).toFixed(2)}h</td>
                    <td className="p-4 text-sm font-black text-emerald-600">NT$ {Math.round(r.salary || 0).toLocaleString()}</td>
                    <td className="p-4 text-right"><button onClick={() => {setDeleteTarget(r); setShowDeleteModal(true)}} className="p-2 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"><Trash2 size={16}/></button></td>
                  </tr>
                ))}
                <tr className="bg-slate-50 font-black text-slate-700 border-t-2 border-slate-200">
                  <td className="p-4 text-sm font-black">當月總結</td><td className="p-4 text-xs text-slate-400 italic">8h/日</td><td className="p-4 text-center"><div className="flex items-center justify-center gap-2 text-xs"><span className="text-orange-700">{totals.ot1.toFixed(2)}h</span><span className="text-slate-300">/</span><span className="text-orange-700">{totals.ot2.toFixed(2)}h</span></div></td>
                  <td className="p-4 text-orange-700 font-black">{totals.otTotal.toFixed(2)}h</td><td className="p-4 text-emerald-700 font-black text-lg">NT$ {totals.salary.toLocaleString()}</td><td className="p-4"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 底部浮動區 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-6 shadow-[0_-10px_30px_rgba(0,0,0,0.05)] z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex flex-col gap-1"><span className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">預估實領薪資總額</span><div className="flex items-center gap-3"><span className="text-3xl font-black text-emerald-600 tracking-tighter">{showSalary ? `NT$ ${totals.salary.toLocaleString()}` : 'NT$ ********'}</span><button onClick={() => setShowSalary(!showSalary)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition text-slate-400">{showSalary ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
          <div className="flex flex-col items-end gap-1"><span className="text-[10px] text-orange-400 font-black uppercase tracking-[0.2em]">總加班時數</span><div className="px-4 py-1.5 bg-orange-600 text-white rounded-full font-black text-sm shadow-lg shadow-orange-100">{totals.otTotal.toFixed(2)} <span className="text-[10px] opacity-80 ml-0.5">HR</span></div></div>
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black mb-6 text-center text-slate-800">匯出報表</h3>
            <div className="space-y-3">
              <button onClick={copyForSheets} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-700 transition shadow-xl shadow-emerald-100 active:scale-95"><Copy size={20}/> 複製到 Google Sheets</button>
              <button onClick={() => setShowExportModal(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition">取消</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl max-w-xs w-full shadow-2xl">
            <h3 className="font-black text-center text-slate-800 mb-6 text-lg tracking-tight">確定要刪除這筆紀錄？</h3>
            <div className="flex gap-3">
              <button onClick={() => { const u = records.filter(r => r.id !== deleteTarget.id); setRecords(u); saveData(u, null); setShowDeleteModal(false); }} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black hover:bg-red-600 transition shadow-lg shadow-red-100">刪除</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold">取消</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTracker;

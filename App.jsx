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
  
  const [timeIn, setTimeIn] = useState({ h: '09', m: '00' });
  const [timeOut, setTimeOut] = useState({ h: '18', m: '00' });
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    breakMinutes: 60,
    note: ''
  });

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const quarters = ['00', '15', '30', '45'];

  useEffect(() => {
    const savedRecords = localStorage.getItem('salary_records');
    const savedSettings = localStorage.getItem('salary_settings');
    if (savedRecords) {
        try { setRecords(JSON.parse(savedRecords)); } catch(e) { setRecords([]); }
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
    
    // 總分鐘數
    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (Number(breakMinutes) || 0);
    if (totalMinutes < 0) totalMinutes = 0;
    const totalHours = totalMinutes / 60;

    // 時數分配
    const regularHours = Math.min(totalHours, 8);
    const overtimeTotal = Math.max(totalHours - 8, 0);
    const overtime1 = Math.min(overtimeTotal, 2);
    const overtime2 = Math.max(overtimeTotal - 2, 0);

    // 薪資計算
    const multiplier = (note === '雙薪') ? 2 : 1;
    const regularPay = regularHours * settings.hourlyRate * multiplier;
    const overtimePay = (overtime1 * settings.hourlyRate * settings.overtimeRate1) + 
                       (overtime2 * settings.hourlyRate * settings.overtimeRate2);

    return {
      regularHours: regularHours,
      overtimeTotal: overtimeTotal,
      overtime1: overtime1,
      overtime2: overtime2,
      salary: Math.round(regularPay + overtimePay)
    };
  };

  const addRecord = () => {
    const checkIn = `${timeIn.h}:${timeIn.m}`;
    const checkOut = `${timeOut.h}:${timeOut.m}`;
    const calc = calculateSalary({ checkIn, checkOut, breakMinutes: newRecord.breakMinutes, note: newRecord.note });
    
    const record = { 
        id: Date.now(), 
        date: newRecord.date,
        checkIn, 
        checkOut, 
        breakMinutes: newRecord.breakMinutes,
        note: newRecord.note,
        ...calc 
    };
    
    const updatedRecords = [record, ...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(updatedRecords);
    saveData(updatedRecords, null);
    setLastAddedInfo(`已新增：${newRecord.date}`);
    setTimeout(() => setLastAddedInfo(null), 3000);
  };

  // 總計計算
  const totals = records.reduce((acc, r) => ({
    salary: acc.salary + (r.salary || 0),
    ot1: acc.ot1 + (r.overtime1 || 0),
    ot2: acc.ot2 + (r.overtime2 || 0),
    otTotal: acc.otTotal + (r.overtimeTotal || 0),
    regTotal: acc.regTotal + (r.regularHours || 0)
  }), { salary: 0, ot1: 0, ot2: 0, otTotal: 0, regTotal: 0 });

  const copyForSheets = () => {
    if (records.length === 0) return alert('目前沒有資料');
    let tsv = "日期\t上班\t下班\t休息\t正常工時\t總加班\t薪資\t備註\n";
    [...records].reverse().forEach(r => {
      tsv += `${r.date}\t${r.checkIn}\t${r.checkOut}\t${r.breakMinutes}\t${(r.regularHours || 0).toFixed(2)}\t${(r.overtimeTotal || 0).toFixed(2)}\t${r.salary}\t${r.note}\n`;
    });
    navigator.clipboard.writeText(tsv);
    alert('已複製到剪貼簿');
    setShowExportModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 pb-40 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex justify-between items-center">
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">💰 薪資出勤系統</h1>
          <button onClick={() => setShowSettings(!showSettings)} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm">⚙️ 設定</button>
        </div>

        {showSettings && (
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <label className="text-xs font-bold text-blue-600 block mb-1">時薪 (NT$)：</label>
            <input type="number" value={settings.hourlyRate} onChange={e => {const s={...settings, hourlyRate:Number(e.target.value)}; setSettings(s); saveData(null, s);}} className="p-2 rounded-lg border bg-white w-full max-w-[200px]"/>
          </div>
        )}

        {/* 輸入區域 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">日期</span>
              <input type="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200"/>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">上班</span>
              <div className="flex gap-1">
                <select value={timeIn.h} onChange={e => setTimeIn({...timeIn, h: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border">
                  {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={timeIn.m} onChange={e => setTimeIn({...timeIn, m: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border">
                  {quarters.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">下班</span>
              <div className="flex gap-1">
                <select value={timeOut.h} onChange={e => setTimeOut({...timeOut, h: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border">
                  {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={timeOut.m} onChange={e => setTimeOut({...timeOut, m: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border">
                  {quarters.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">類別</span>
              <select value={newRecord.note} onChange={e => setNewRecord({...newRecord, note: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border">
                <option value="">正常上班</option>
                <option value="雙薪">雙薪</option>
                <option value="病假">病假</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">休息 (分鐘)</span>
              <div className="flex gap-2">
                {[60, 0].map(val => (
                  <button key={val} onClick={() => setNewRecord({...newRecord, breakMinutes: val})} className={`flex-1 py-2 rounded-lg font-bold ${newRecord.breakMinutes === val ? 'bg-slate-800 text-white' : 'bg-slate-100'}`}>
                    {val} 分
                  </button>
                ))}
              </div>
            </div>
            <button onClick={addRecord} className="w-full bg-blue-600 text-white py-3 rounded-lg font-black mt-auto">新增紀錄</button>
          </div>
          {lastAddedInfo && <div className="text-emerald-600 text-xs font-bold">{lastAddedInfo}</div>}
        </div>

        {/* 列表區域 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <span className="font-bold text-slate-500">歷史清單</span>
            <button onClick={() => setShowExportModal(true)} className="text-emerald-600 text-sm font-bold flex items-center gap-1"><Download size={14}/> 匯出</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="text-[10px] text-slate-400 bg-slate-50 font-black uppercase">
                <tr>
                  <th className="p-4">日期/時間</th>
                  <th className="p-4">正常</th>
                  <th className="p-4">加班 (1.34/1.67)</th>
                  <th className="p-4">薪資</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {records.map(r => (
                  <tr key={r.id} className="border-b group hover:bg-slate-50">
                    <td className="p-4">
                      <div className="text-sm font-bold">{r.date}</div>
                      <div className="text-[10px] text-slate-400">{r.checkIn}-{r.checkOut} ({r.breakMinutes}m) {r.note && <span className="text-blue-500">[{r.note}]</span>}</div>
                    </td>
                    <td className="p-4 text-sm">{(r.regularHours || 0).toFixed(2)}h</td>
                    <td className="p-4 text-sm text-orange-600 font-bold">{(r.overtime1 || 0).toFixed(2)} / {(r.overtime2 || 0).toFixed(2)}</td>
                    <td className="p-4 text-sm font-black text-emerald-600">NT$ {r.salary?.toLocaleString()}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => {setDeleteTarget(r); setShowDeleteModal(true)}} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 底部總計列 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t p-6 z-40">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <span className="text-[10px] text-slate-400 font-black uppercase">實領總額</span>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-black text-emerald-600">{showSalary ? `NT$ ${totals.salary.toLocaleString()}` : 'NT$ ****'}</span>
              <button onClick={() => setShowSalary(!showSalary)} className="text-slate-300">{showSalary ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
            </div>
          </div>
          <div className="text-right">
              <span className="text-[10px] text-orange-400 font-black uppercase">總加班時數</span>
              <span className="text-xl font-black text-orange-600">{totals.otTotal.toFixed(2)} h</span>
          </div>
        </div>
      </div>

      {/* 刪除確認彈窗 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl max-w-xs w-full">
            <h3 className="font-black text-center mb-6">確定刪除？</h3>
            <div className="flex gap-3">
              <button onClick={() => {
                const updated = records.filter(r => r.id !== deleteTarget.id);
                setRecords(updated);
                saveData(updated, null);
                setShowDeleteModal(false);
              }} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black">刪除</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 匯出彈窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl">
            <h3 className="text-xl font-black mb-6 text-center">匯出資料</h3>
            <button onClick={copyForSheets} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-3">
              <Copy size={20}/> 複製到剪貼簿
            </button>
            <button onClick={() => setShowExportModal(false)} className="w-full py-4 text-slate-400 font-bold mt-2">關閉</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTracker;

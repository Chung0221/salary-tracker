import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Calendar, Archive, FileSpreadsheet, Table, CheckCircle2, Eye, EyeOff, Copy, Clock, Coffee, AlertTriangle, TrendingUp } from 'lucide-react';

const SalaryTracker = () => {
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState({
    hourlyRate: 196,
    overtimeRate1: 1.34,
    overtimeRate2: 1.67,
    settlementDay: 25
  });
  
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showPrivateData, setShowPrivateData] = useState(false); // 控制所有數據隱藏
  const [lastAddedInfo, setLastAddedInfo] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [timeIn, setTimeIn] = useState({ h: '09', m: '00' });
  const [timeOut, setTimeOut] = useState({ h: '18', m: '00' });
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    breakMinutes: 60,
    note: ''
  });

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
    
    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (Number(breakMinutes) || 0);
    if (totalMinutes < 0) totalMinutes = 0;
    const netHours = totalMinutes / 60;

    if (note === '休出') {
      const ot1 = Math.min(netHours, 2); 
      const ot2 = Math.max(netHours - 2, 0); 
      const pay = Math.round((ot1 * settings.hourlyRate * 1.34) + (ot2 * settings.hourlyRate * 1.67));
      return { regularHours: 0, overtimeTotal: netHours, overtime1: ot1, overtime2: ot2, salary: pay };
    }

    const regularHours = Math.min(netHours, 8);
    const overtimeTotal = Math.max(netHours - 8, 0);
    const overtime1 = Math.min(overtimeTotal, 2);
    const overtime2 = Math.max(overtimeTotal - 2, 0);
    const multiplier = (note === '雙薪') ? 2 : 1;
    const regularPay = regularHours * settings.hourlyRate * multiplier;
    const overtimePay = (overtime1 * settings.hourlyRate * settings.overtimeRate1) + 
                       (overtime2 * settings.hourlyRate * settings.overtimeRate2);

    return { regularHours, overtimeTotal, overtime1, overtime2, salary: Math.round(regularPay + overtimePay) };
  };

  const addRecord = () => {
    const checkIn = `${timeIn.h}:${timeIn.m}`;
    const checkOut = `${timeOut.h}:${timeOut.m}`;
    const calc = calculateSalary({ checkIn, checkOut, breakMinutes: newRecord.breakMinutes, note: newRecord.note });
    const record = { 
        id: Date.now(), 
        date: newRecord.date, 
        checkIn, checkOut, 
        breakMinutes: newRecord.breakMinutes, 
        note: newRecord.note, 
        appliedRate: settings.hourlyRate,
        ...calc 
    };
    const updatedRecords = [record, ...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(updatedRecords);
    saveData(updatedRecords, null);
    setLastAddedInfo(`已新增：${newRecord.date}`);
    setTimeout(() => setLastAddedInfo(null), 3000);
  };

  const totals = records.reduce((acc, r) => ({
    salary: acc.salary + (r.salary || 0),
    ot1: acc.ot1 + (r.overtime1 || 0),
    ot2: acc.ot2 + (r.overtime2 || 0),
    otTotal: acc.otTotal + (r.overtimeTotal || 0),
    regTotal: acc.regTotal + (r.regularHours || 0)
  }), { salary: 0, ot1: 0, ot2: 0, otTotal: 0, regTotal: 0 });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* 頂部導覽列：數據全集中 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">💰 精神賠償金核算系統</h1>
            
            {/* 總薪資區 */}
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">本月實領</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-emerald-600">
                  {showPrivateData ? `NT$ ${totals.salary.toLocaleString()}` : 'NT$ ****'}
                </span>
                <button onClick={() => setShowPrivateData(!showPrivateData)} className="text-slate-400 hover:text-slate-600">
                  {showPrivateData ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* 加班數據區 */}
            <div className="flex gap-4 border-l pl-6 border-slate-100">
              <div className="flex flex-col">
                <span className="text-[10px] text-orange-400 font-bold uppercase">總加班</span>
                <span className="text-sm font-black text-orange-600">
                  {showPrivateData ? `${totals.otTotal.toFixed(1)}h` : '--'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">1.34h / 1.67h</span>
                <span className="text-xs font-bold text-slate-600">
                  {showPrivateData ? `${totals.ot1.toFixed(1)} / ${totals.ot2.toFixed(1)}` : '--'}
                </span>
              </div>
            </div>
          </div>

          <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs hover:bg-slate-200 transition-colors">⚙️ 設定</button>
        </div>

        {showSettings && (
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-4 shadow-inner">
            <div className="flex items-center gap-4">
                <div>
                    <label className="text-xs font-bold text-blue-600 block mb-1">時薪設定：</label>
                    <input type="number" value={settings.hourlyRate} onChange={e => {const s={...settings, hourlyRate:Number(e.target.value)}; setSettings(s); saveData(null, s);}} className="p-2 rounded-lg border bg-white w-[120px] font-black text-blue-700 outline-none"/>
                </div>
                <div className="text-[10px] text-blue-400 mt-5 italic">*精神賠償每一塊錢都要精算！</div>
            </div>
            <div className="border-t border-blue-100 pt-3">
                <button onClick={() => setShowDeleteAllModal(true)} className="flex items-center gap-2 text-red-500 text-xs font-bold hover:bg-red-50 p-1 rounded transition-colors"><Trash2 size={12}/> 清空紀錄</button>
            </div>
          </div>
        )}

        {/* 輸入區域 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">日期</span>
              <input type="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200"/>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">上下班</span>
              <div className="flex gap-1 text-xs">
                <select value={timeIn.h} onChange={e => setTimeIn({...timeIn, h: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border">
                  {Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}
                </select>
                <select value={timeOut.h} onChange={e => setTimeOut({...timeOut, h: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border">
                  {Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">類型 / 休息</span>
              <div className="flex gap-1 text-xs">
                <select value={newRecord.note} onChange={e => setNewRecord({...newRecord, note: e.target.value})} className="flex-[2] p-2 bg-slate-50 rounded-lg border font-bold">
                  <option value="">正常</option>
                  <option value="休出">休出</option>
                  <option value="雙薪">雙薪</option>
                  <option value="病假">病假</option>
                </select>
                <select value={newRecord.breakMinutes} onChange={e => setNewRecord({...newRecord, breakMinutes: Number(e.target.value)})} className="flex-1 p-2 bg-slate-50 rounded-lg border">
                  <option value={60}>60m</option>
                  <option value={0}>0m</option>
                </select>
              </div>
            </div>
            <div className="pt-5">
              <button onClick={addRecord} className="w-full bg-blue-600 text-white py-2 rounded-lg font-black hover:bg-blue-700 shadow-md">新增紀錄</button>
            </div>
          </div>
          {lastAddedInfo && <div className="text-emerald-600 text-[10px] font-bold flex items-center gap-1"><CheckCircle2 size={12}/>{lastAddedInfo}</div>}
        </div>

        {/* 歷史清單 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center">
            <span className="text-sm font-black text-slate-500">血汗紀錄</span>
            <button onClick={() => setShowExportModal(true)} className="text-emerald-600 text-xs font-bold flex items-center gap-1"><Download size={14}/> 匯出</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[600px]">
              <thead className="text-[10px] text-slate-400 bg-slate-50 font-black uppercase">
                <tr>
                  <th className="p-4">日期</th>
                  <th className="p-4 text-center">時薪</th>
                  <th className="p-4 text-center">淨工時</th>
                  <th className="p-4 text-center">加班 (1.34 / 1.67)</th>
                  <th className="p-4 text-center">類型</th>
                  <th className="p-4 text-right">薪資</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold">
                      {r.date}
                      <div className="text-[10px] text-slate-400 font-normal">{r.checkIn}-{r.checkOut}</div>
                    </td>
                    <td className="p-4 text-center text-blue-600 font-black">NT$ {r.appliedRate}</td>
                    <td className="p-4 text-center font-medium">{(r.overtimeTotal + r.regularHours).toFixed(1)}h</td>
                    <td className="p-4 text-center text-xs text-slate-500">
                       {r.overtimeTotal > 0 ? (
                         <span className="font-bold text-orange-600">{r.overtime1.toFixed(1)} <span className="text-slate-300 mx-1">/</span> {r.overtime2.toFixed(1)}</span>
                       ) : '-'}
                    </td>
                    <td className="p-4 text-center">
                       <span className={`text-[10px] font-bold px-2 py-1 rounded ${r.note === '休出' ? 'bg-orange-100 text-orange-600' : r.note === '雙薪' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                          {r.note || '正常'}
                       </span>
                    </td>
                    <td className="p-4 text-right font-black text-emerald-600">NT$ {r.salary?.toLocaleString()}</td>
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

      {/* 彈窗部分維持穩定 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full shadow-2xl">
            <h3 className="font-black text-center mb-6">確定刪除此筆紀錄？</h3>
            <div className="flex gap-3">
              <button onClick={() => { const updated = records.filter(r => r.id !== deleteTarget.id); setRecords(updated); localStorage.setItem('salary_records', JSON.stringify(updated)); setShowDeleteModal(false); }} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black">刪除</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500 text-center">取消</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full border-t-8 border-red-500 shadow-2xl">
            <h3 className="font-black text-center text-lg mb-2 text-red-600">危險操作！</h3>
            <p className="text-xs text-slate-500 text-center mb-6">這將會清除所有已儲存的歷史薪資紀錄。</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setRecords([]); localStorage.setItem('salary_records', JSON.stringify([])); setShowDeleteAllModal(false); }} className="w-full py-3 bg-red-500 text-white rounded-xl font-black">確定全部刪除</button>
              <button onClick={() => setShowDeleteAllModal(false)} className="w-full py-3 bg-slate-100 rounded-xl font-bold text-slate-400 text-center">取消</button>
            </div>
          </div>
        </div>
      )}

      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-black mb-6">匯出至試算表</h3>
            <button onClick={() => {
                let tsv = "日期\t時薪\t工時\t1.34加班\t1.67加班\t薪資\t備註\n";
                [...records].reverse().forEach(r => {
                  tsv += `${r.date}\t${r.appliedRate}\t${(r.overtimeTotal+r.regularHours).toFixed(1)}\t${r.overtime1.toFixed(1)}\t${r.overtime2.toFixed(1)}\t${r.salary}\t${r.note}\n`;
                });
                navigator.clipboard.writeText(tsv);
                alert('已複製到剪貼簿，請至 Google Sheets 貼上');
                setShowExportModal(false);
            }} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 mb-2">
              <Copy size={20}/> 複製內容
            </button>
            <button onClick={() => setShowExportModal(false)} className="w-full py-4 text-slate-400 font-bold">關閉</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTracker;




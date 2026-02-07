import React, { useState, useEffect } from 'react';
import { Download, Plus, Trash2, Calendar, Archive, FileSpreadsheet, Table, CheckCircle2, Eye, EyeOff, Copy, Clock, Coffee, AlertTriangle } from 'lucide-react';

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
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showSalary, setShowSalary] = useState(false); 
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
    
    let totalMinutes = (outH * 60 + outM) - (inH * 60 + inM) - (Number(breakMinutes) || 0);
    if (totalMinutes < 0) totalMinutes = 0;
    const netHours = totalMinutes / 60;

    if (note === '休出') {
      const ot1 = Math.min(netHours, 2); 
      const ot2 = Math.min(Math.max(netHours - 2, 0), 6); 
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
        checkIn, 
        checkOut, 
        breakMinutes: newRecord.breakMinutes, 
        note: newRecord.note, 
        appliedRate: settings.hourlyRate, // 紀錄當下使用的時薪
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
    otTotal: acc.otTotal + (r.overtimeTotal || 0),
    regTotal: acc.regTotal + (r.regularHours || 0)
  }), { salary: 0, otTotal: 0, regTotal: 0 });

  const copyForSheets = () => {
    if (records.length === 0) return alert('目前沒有資料');
    let tsv = "日期\t上班\t下班\t休息\t使用時薪\t總工時\t薪資\t備註\n";
    [...records].reverse().forEach(r => {
      tsv += `${r.date}\t${r.checkIn}\t${r.checkOut}\t${r.breakMinutes}\t${r.appliedRate}\t${(r.overtimeTotal + r.regularHours).toFixed(2)}\t${r.salary}\t${r.note}\n`;
    });
    navigator.clipboard.writeText(tsv);
    alert('已複製到剪貼簿');
    setShowExportModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* 頂部導覽列 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-800 tracking-tight">💰 薪資系統</h1>
            <div className="h-8 w-[1px] bg-slate-200 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-black text-emerald-600">
                {showSalary ? `NT$ ${totals.salary.toLocaleString()}` : 'NT$ ****'}
              </span>
              <button onClick={() => setShowSalary(!showSalary)} className="text-slate-400 hover:text-slate-600">
                {showSalary ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-xs">⚙️ 設定</button>
        </div>

        {showSettings && (
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 space-y-4">
            <div>
                <label className="text-xs font-bold text-blue-600 block mb-1">目前時薪設定：</label>
                <input type="number" value={settings.hourlyRate} onChange={e => {const s={...settings, hourlyRate:Number(e.target.value)}; setSettings(s); saveData(null, s);}} className="p-2 rounded-lg border bg-white w-full max-w-[150px] font-black text-blue-700 shadow-sm focus:ring-2 focus:ring-blue-300 outline-none transition-all"/>
                <p className="text-[10px] text-blue-400 mt-2 font-medium">※ 變更後，新紀錄會套用此時薪。舊紀錄時薪不會被改變。</p>
            </div>
            <div className="border-t border-blue-100 pt-3">
                <button onClick={() => setShowDeleteAllModal(true)} className="flex items-center gap-2 text-red-500 text-xs font-bold hover:bg-red-50 p-2 rounded-lg transition-colors">
                    <Trash2 size={14}/> 清空所有歷史紀錄
                </button>
            </div>
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
              <span className="text-xs font-bold text-slate-400">上班 / 下班</span>
              <div className="flex gap-1">
                <select value={timeIn.h} onChange={e => setTimeIn({...timeIn, h: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border text-sm">
                  {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
                <select value={timeOut.h} onChange={e => setTimeOut({...timeOut, h: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border text-sm">
                  {hours.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">類型</span>
              <select value={newRecord.note} onChange={e => setNewRecord({...newRecord, note: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border text-sm font-medium">
                <option value="">正常上班</option>
                <option value="休出">休息日 (休出)</option>
                <option value="雙薪">雙薪</option>
                <option value="病假">病假</option>
              </select>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">休息 (分) / 操作</span>
              <div className="flex gap-2">
                <select value={newRecord.breakMinutes} onChange={e => setNewRecord({...newRecord, breakMinutes: Number(e.target.value)})} className="p-2 bg-slate-50 rounded-lg border text-sm">
                  <option value={60}>60分</option>
                  <option value={0}>0分</option>
                </select>
                <button onClick={addRecord} className="flex-1 bg-blue-600 text-white rounded-lg font-black hover:bg-blue-700 transition-all shadow-md active:scale-95 text-sm">新增</button>
              </div>
            </div>
          </div>
          {lastAddedInfo && <div className="text-emerald-600 text-xs font-bold flex items-center gap-1 animate-pulse"><CheckCircle2 size={12}/>{lastAddedInfo}</div>}
        </div>

        {/* 歷史清單 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-sm">
            <span className="font-black text-slate-500 uppercase tracking-wider">歷史出勤紀錄</span>
            <button onClick={() => setShowExportModal(true)} className="text-emerald-600 font-bold flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"><Download size={14}/> 匯出</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[500px]">
              <thead className="text-[10px] text-slate-400 bg-slate-50 font-black uppercase">
                <tr>
                  <th className="p-4 w-[25%]">日期/時間</th>
                  <th className="p-4 text-center">總工時</th>
                  <th className="p-4 text-center">使用的時薪</th>
                  <th className="p-4 text-center">類型</th>
                  <th className="p-4 text-right">薪資</th>
                  <th className="p-4 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4">
                      <div className="text-sm font-bold">{r.date}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{r.checkIn}-{r.checkOut}</div>
                    </td>
                    <td className="p-4 text-center text-sm font-medium">{(r.overtimeTotal + r.regularHours).toFixed(1)} <span className="text-[10px] text-slate-400">h</span></td>
                    <td className="p-4 text-center font-black text-blue-600">
                      <span className="bg-blue-50 px-2 py-1 rounded text-xs">NT$ {r.appliedRate || settings.hourlyRate}</span>
                    </td>
                    <td className="p-4 text-center">
                       <span className={`text-[10px] font-bold px-2 py-1 rounded ${r.note === '休出' ? 'bg-orange-100 text-orange-600' : r.note === '雙薪' ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                          {r.note || '正常'}
                       </span>
                    </td>
                    <td className="p-4 text-right text-sm font-black text-emerald-600">
                      NT$ {r.salary?.toLocaleString()}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => {setDeleteTarget(r); setShowDeleteModal(true)}} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length === 0 && (
              <div className="p-20 text-center text-slate-300 font-bold italic tracking-widest">尚無紀錄</div>
            )}
          </div>
        </div>
      </div>

      {/* 刪除確認彈窗 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full shadow-2xl">
            <h3 className="font-black text-center mb-6">確定刪除此筆紀錄？</h3>
            <div className="flex gap-3">
              <button onClick={() => { const updated = records.filter(r => r.id !== deleteTarget.id); setRecords(updated); localStorage.setItem('salary_records', JSON.stringify(updated)); setShowDeleteModal(false); }} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black">刪除</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-500">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 全域刪除彈窗 */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full border-t-8 border-red-500 shadow-2xl">
            <h3 className="font-black text-center text-lg mb-2">確定清空所有紀錄？</h3>
            <div className="flex flex-col gap-2 mt-4">
              <button onClick={() => { setRecords([]); localStorage.setItem('salary_records', JSON.stringify([])); setShowDeleteAllModal(false); }} className="w-full py-3 bg-red-500 text-white rounded-xl font-black shadow-lg shadow-red-100">是的，全部刪除</button>
              <button onClick={() => setShowDeleteAllModal(false)} className="w-full py-3 bg-slate-100 rounded-xl font-bold text-slate-400 text-center">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 匯出彈窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileSpreadsheet className="text-emerald-600" size={32}/>
            </div>
            <h3 className="text-xl font-black mb-2 text-slate-800">匯出至 Google Sheets</h3>
            <p className="text-xs text-slate-400 mb-6">將複製帶有時薪、工時、薪資的內容，<br/>直接在試算表中按 Ctrl+V 貼上即可。</p>
            <button onClick={copyForSheets} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95">
              <Copy size={20}/> 複製內容
            </button>
            <button onClick={() => setShowExportModal(false)} className="w-full py-4 text-slate-400 font-bold mt-2 hover:text-slate-600">取消離開</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTracker;

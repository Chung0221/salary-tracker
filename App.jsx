import React, { useState, useEffect } from 'react';
import { Download, Trash2, CheckCircle2, Eye, EyeOff, Copy, TrendingUp, ShieldAlert, ThumbsUp } from 'lucide-react';

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
  const [showPrivateData, setShowPrivateData] = useState(false); 
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
        note: newRecord.note || '正常', 
        appliedRate: settings.hourlyRate,
        ...calc 
    };
    const updatedRecords = [record, ...records].sort((a, b) => new Date(b.date) - new Date(a.date));
    setRecords(updatedRecords);
    saveData(updatedRecords, null);
    setLastAddedInfo(newRecord.date);
    setTimeout(() => setLastAddedInfo(null), 3000);
  };

  const totals = records.reduce((acc, r) => ({
    salary: acc.salary + (r.salary || 0),
    ot1: acc.ot1 + (r.overtime1 || 0),
    ot2: acc.ot2 + (r.overtime2 || 0),
    otTotal: acc.otTotal + (r.overtimeTotal || 0),
    regTotal: acc.regTotal + (r.regularHours || 0)
  }), { salary: 0, ot1: 0, ot2: 0, otTotal: 0, regTotal: 0 });

  // 強化後的匯出邏輯
  const copyForSheets = () => {
    if (records.length === 0) return alert('目前沒有紀錄可以匯出');
    
    // 欄位表頭
    let tsv = "日期\t上班\t下班\t休息(分)\t時薪\t總工時\t1.34加班\t1.67加班\t總加班時數\t薪資(精神賠償)\t備註\n";
    
    // 每一筆資料內容 (按日期正序)
    [...records].reverse().forEach(r => {
      const totalWork = (r.regularHours + r.overtimeTotal).toFixed(1);
      tsv += `${r.date}\t${r.checkIn}\t${r.checkOut}\t${r.breakMinutes}\t${r.appliedRate}\t${totalWork}\t${r.overtime1.toFixed(1)}\t${r.overtime2.toFixed(1)}\t${r.overtimeTotal.toFixed(1)}\t${r.salary}\t${r.note}\n`;
    });

    // 匯出記錄裡的總結行：精確對準 1.34, 1.67, 總加班, 薪資
    tsv += `\n[當月結算]\t\t\t\t\t\t${totals.ot1.toFixed(1)}\t${totals.ot2.toFixed(1)}\t${totals.otTotal.toFixed(1)}\t${totals.salary}\t領完錢就走人👍\n`;

    navigator.clipboard.writeText(tsv);
    alert('👍 匯出記錄已優化！\n已新增 1.34、1.67、總加班與總薪資的加總，請至 Excel/Sheets 貼上。');
    setShowExportModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* 頂部數據列 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap justify-between items-center gap-4 border-b-4 border-b-emerald-500">
          <div className="flex flex-wrap items-center gap-6">
            <h1 className="text-xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
              <ShieldAlert className="text-red-500" size={24}/>
              精神賠償金核算系統
            </h1>
            
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">目前累計賠償</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-emerald-600">
                  {showPrivateData ? `NT$ ${totals.salary.toLocaleString()}` : 'NT$ ****'}
                </span>
                <button onClick={() => setShowPrivateData(!showPrivateData)} className="text-slate-400 hover:text-slate-600">
                  {showPrivateData ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="flex gap-4 border-l pl-6 border-slate-100">
              <div className="flex flex-col">
                <span className="text-[10px] text-orange-400 font-bold uppercase">總加班</span>
                <span className="text-sm font-black text-orange-600">
                  {showPrivateData ? `${totals.otTotal.toFixed(1)}h` : '--'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">1.34 / 1.67</span>
                <span className="text-xs font-bold text-slate-600">
                  {showPrivateData ? `${totals.ot1.toFixed(1)} / ${totals.ot2.toFixed(1)}` : '--'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg font-bold text-xs hover:bg-black transition-colors">⚙️ 參數</button>
        </div>

        {/* 輸入區域 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center gap-2 mb-2 p-3 bg-slate-900 rounded-xl">
            <TrendingUp size={16} className="text-emerald-400"/>
            <span className="text-sm font-black text-white italic tracking-tighter">
              「公司亂它的，我存我的；每一筆賠償金，都是我離開這裡的底氣。」
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">日期</span>
              <input type="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border border-slate-200"/>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400">進場 / 離場</span>
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
              <span className="text-xs font-bold text-slate-400">類別 / 休息</span>
              <div className="flex gap-1 text-xs">
                <select value={newRecord.note} onChange={e => setNewRecord({...newRecord, note: e.target.value})} className="flex-[2] p-2 bg-slate-50 rounded-lg border font-bold text-blue-600">
                  <option value="">正常受難</option>
                  <option value="休出">休息日加班</option>
                  <option value="雙薪">雙薪日</option>
                  <option value="病假">逃離現場</option>
                </select>
                <select value={newRecord.breakMinutes} onChange={e => setNewRecord({...newRecord, breakMinutes: Number(e.target.value)})} className="flex-1 p-2 bg-slate-50 rounded-lg border">
                  <option value={60}>60m</option>
                  <option value={0}>0m</option>
                </select>
              </div>
            </div>
            <div className="pt-5">
              <button onClick={addRecord} className="w-full bg-emerald-600 text-white py-2 rounded-lg font-black hover:bg-emerald-700 shadow-md transition-all active:scale-95">領取賠償金紀錄</button>
            </div>
          </div>
          {lastAddedInfo && (
            <div className="bg-emerald-50 text-emerald-700 p-2 rounded-lg text-xs font-black flex items-center justify-center gap-2 border border-emerald-200 animate-bounce">
                <ThumbsUp size={14}/> <span>👍 紀錄成功：{lastAddedInfo}</span>
            </div>
          )}
        </div>

        {/* 歷史清單 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-sm">
            <span className="font-black text-slate-500 flex items-center gap-2 uppercase">📖 自由基金累積帳本</span>
            <button onClick={() => setShowExportModal(true)} className="text-emerald-600 font-bold flex items-center gap-1 hover:bg-emerald-50 px-2 py-1 rounded-lg transition-colors"><Download size={14}/> 匯出記錄</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[650px]">
              <thead className="text-[10px] text-slate-400 bg-slate-50 font-black uppercase">
                <tr>
                  <th className="p-4">受難日期</th>
                  <th className="p-4 text-center">時薪</th>
                  <th className="p-4 text-center">淨工時</th>
                  <th className="p-4 text-center">加班 (1.34 / 1.67)</th>
                  <th className="p-4 text-center">類型</th>
                  <th className="p-4 text-right">賠償金額</th>
                  <th className="p-4 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-bold">{r.date}<div className="text-[10px] text-slate-400 font-normal">{r.checkIn}-{r.checkOut}</div></td>
                    <td className="p-4 text-center text-blue-600 font-black">NT$ {r.appliedRate}</td>
                    <td className="p-4 text-center font-medium">{(r.overtimeTotal + r.regularHours).toFixed(1)}h</td>
                    <td className="p-4 text-center text-xs font-bold text-orange-600">{r.overtimeTotal > 0 ? `${r.overtime1.toFixed(1)} / ${r.overtime2.toFixed(1)}` : '-'}</td>
                    <td className="p-4 text-center"><span className="px-2 py-1 bg-slate-100 text-slate-500 rounded text-[10px] font-bold">{r.note}</span></td>
                    <td className="p-4 text-right font-black text-emerald-600">{showPrivateData ? `NT$ ${r.salary?.toLocaleString()}` : 'NT$ ****'}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => {setDeleteTarget(r); setShowDeleteModal(true)}} className="text-slate-300 hover:text-red-500 p-1"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 匯出彈窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <h3 className="text-xl font-black mb-2 text-slate-800">匯出完整清單</h3>
            <p className="text-xs text-slate-400 mb-6 italic">已在記錄末尾自動新增：<br/>1.34 / 1.67 總時數與賠償金總額。</p>
            <button onClick={copyForSheets} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2 mb-2 active:scale-95 shadow-lg">
              <Copy size={20}/> 複製完整內容
            </button>
            <button onClick={() => setShowExportModal(false)} className="w-full py-4 text-slate-400 font-bold">返回核算</button>
          </div>
        </div>
      )}

      {/* 設定與刪除彈窗略... (保持原樣) */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full shadow-2xl">
            <label className="text-xs font-bold text-slate-400 block mb-2">時薪設定</label>
            <input type="number" value={settings.hourlyRate} onChange={e => {const s={...settings, hourlyRate:Number(e.target.value)}; setSettings(s); saveData(null, s);}} className="w-full p-3 rounded-xl border bg-slate-50 font-black text-slate-800 outline-none mb-4"/>
            <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">儲存並關閉</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTracker;


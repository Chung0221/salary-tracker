import React, { useState, useEffect } from 'react';
import { Download, Trash2, Eye, EyeOff, Copy, ThumbsUp, Leaf, AlertTriangle, Clock, DollarSign, Calendar } from 'lucide-react';

const SalaryTracker = () => {
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState({
    hourlyRate: 200,
    overtimeRate1: 1.34,
    overtimeRate2: 1.67,
    settlementDay: 25,
    defaultBreak: 60 // 預設休息時間
  });
  
  const slogans = [
    "心若淡定，利息自來。看著數字成長，也是一種修行。",
    "公司亂它的，我存我的。每一筆帳，都是通往自由的小徑。",
    "讓今日的忙碌，化作明日數位帳戶裡的清泉。",
    "世界越嘈雜，心靈越平靜；帳戶越豐盈，底氣越充足。",
    "不與混亂爭辯，只與財富同行。存錢，是給自己最好的安慰。",
    "今天流過的每一秒，都正在利息的溫床裡發芽。",
    "雲淡風輕地領取精神賠償金，這是屬於我的優雅反擊。",
    "目前的受難只是過客，銀行裡的複利才是長久的陪伴。"
  ];

  const [currentSlogan, setCurrentSlogan] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showRangeDeleteModal, setShowRangeDeleteModal] = useState(false);
  const [showPrivateData, setShowPrivateData] = useState(false); 
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [timeIn, setTimeIn] = useState({ h: '09', m: '00' });
  const [timeOut, setTimeOut] = useState({ h: '18', m: '00' });
  
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    breakMinutes: 60,
    note: ''
  });

  useEffect(() => {
    const randomSlogan = slogans[Math.floor(Math.random() * slogans.length)];
    setCurrentSlogan(randomSlogan);
    const savedRecords = localStorage.getItem('salary_records');
    const savedSettings = localStorage.getItem('salary_settings');
    if (savedRecords) {
        try { setRecords(JSON.parse(savedRecords)); } catch(e) { setRecords([]); }
    }
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      setNewRecord(prev => ({ ...prev, breakMinutes: parsedSettings.defaultBreak || 60 }));
    }
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
    const overtimePay = (overtime1 * settings.hourlyRate * settings.overtimeRate1) + (overtime2 * settings.hourlyRate * settings.overtimeRate2);
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
  };

  const totals = records.reduce((acc, r) => ({
    salary: acc.salary + (r.salary || 0),
    ot1: acc.ot1 + (r.overtime1 || 0),
    ot2: acc.ot2 + (r.overtime2 || 0),
    otTotal: acc.otTotal + (r.overtimeTotal || 0)
  }), { salary: 0, ot1: 0, ot2: 0, otTotal: 0 });

  const copyToClipboard = (targetRecords) => {
    if (targetRecords.length === 0) {
      alert("選取區間內無資料！");
      return;
    }
    let tsv = "日期\t上班\t下班\t休息(分)\t時薪\t總工時\t1.34加班\t1.67加班\t總加班時數\t薪資\t備註\n";
    [...targetRecords].reverse().forEach(r => {
      tsv += `${r.date}\t${r.checkIn}\t${r.checkOut}\t${r.breakMinutes}\t${r.appliedRate}\t${(r.regularHours+r.overtimeTotal).toFixed(2)}\t${r.overtime1.toFixed(2)}\t${r.overtime2.toFixed(2)}\t${r.overtimeTotal.toFixed(2)}\t${r.salary}\t${r.note}\n`;
    });
    navigator.clipboard.writeText(tsv);
    alert('👍 區間資料已複製到剪貼簿！');
    setShowExportModal(false);
  };

  const deleteByRange = () => {
    const updated = records.filter(r => r.date < dateRange.start || r.date > dateRange.end);
    setRecords(updated);
    saveData(updated, null);
    setShowRangeDeleteModal(false);
    alert(`已刪除 ${dateRange.start} 至 ${dateRange.end} 的紀錄`);
  };

  const clearAllRecords = () => {
    setRecords([]);
    saveData([], null);
    setShowDeleteAllModal(false);
    setShowSettings(false);
  };

  const minuteOptions = ['00', '15', '30', '45'];
  // 休息時間選項（15分一區間，最高到 120 分）
  const breakOptions = [0, 15, 30, 45, 60, 75, 90, 105, 120];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* 頂部數據列 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <h1 className="text-xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
              <Leaf className="text-emerald-500" size={24}/>
              清心自由基金帳本
            </h1>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">預計入帳總額</span>
              <div className="flex items-center gap-2 text-emerald-600 font-black">
                <span className="text-lg">{showPrivateData ? `NT$ ${totals.salary.toLocaleString()}` : 'NT$ ****'}</span>
                <button onClick={() => setShowPrivateData(!showPrivateData)} className="text-slate-400">
                  {showPrivateData ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <div className="flex gap-4 border-l pl-6 border-slate-100">
              <div className="flex flex-col">
                <span className="text-[10px] text-orange-400 font-bold uppercase">總加班</span>
                <span className="text-sm font-black text-orange-600">{showPrivateData ? `${totals.otTotal.toFixed(2)}h` : '--'}</span>
              </div>
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold">⚙️ 設定</button>
        </div>

        {/* 標語 */}
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 flex items-center gap-4 shadow-sm">
            <div className="p-2 bg-emerald-500 rounded-full shrink-0"><Leaf size={20} className="text-white"/></div>
            <p className="text-emerald-800 font-bold text-base md:text-lg">{currentSlogan}</p>
        </div>

        {/* 輸入區域 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">日期</span>
              <input type="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border-none"/>
            </div>
            
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">上班 / 下班 (15分單位)</span>
              <div className="flex gap-1 items-center">
                <div className="flex bg-slate-50 rounded-lg overflow-hidden flex-1 border border-transparent focus-within:border-emerald-500 text-center">
                  <select value={timeIn.h} onChange={e => setTimeIn({...timeIn, h: e.target.value})} className="bg-transparent p-2 pr-0 outline-none w-full">
                    {Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="p-2 px-0 text-slate-300">:</span>
                  <select value={timeIn.m} onChange={e => setTimeIn({...timeIn, m: e.target.value})} className="bg-transparent p-2 pl-0 outline-none w-full">
                    {minuteOptions.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <span className="text-slate-300 text-xs">至</span>
                <div className="flex bg-slate-50 rounded-lg overflow-hidden flex-1 border border-transparent focus-within:border-emerald-500 text-center">
                  <select value={timeOut.h} onChange={e => setTimeOut({...timeOut, h: e.target.value})} className="bg-transparent p-2 pr-0 outline-none w-full">
                    {Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}
                  </select>
                  <span className="p-2 px-0 text-slate-300">:</span>
                  <select value={timeOut.m} onChange={e => setTimeOut({...timeOut, m: e.target.value})} className="bg-transparent p-2 pl-0 outline-none w-full">
                    {minuteOptions.map(m=><option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase">性質 / 休息 (15分單位)</span>
              <div className="flex gap-1">
                <select value={newRecord.note} onChange={e => setNewRecord({...newRecord, note: e.target.value})} className="flex-[2] p-2 bg-slate-50 rounded-lg border-none font-bold text-emerald-600 outline-none">
                  <option value="">例行紀錄</option>
                  <option value="休出">假日加班</option>
                  <option value="雙薪">雙薪加乘</option>
                  <option value="病假">身心修復</option>
                </select>
                <select 
                  value={newRecord.breakMinutes} 
                  onChange={e => setNewRecord({...newRecord, breakMinutes: Number(e.target.value)})}
                  className="flex-1 p-2 bg-slate-50 rounded-lg border-none text-center font-bold text-slate-600 outline-none"
                >
                  {breakOptions.map(opt => <option key={opt} value={opt}>{opt}m</option>)}
                </select>
              </div>
            </div>
            <div className="pt-5">
              <button onClick={addRecord} className="w-full bg-slate-800 text-white py-2 rounded-lg font-black hover:bg-black transition-all">錄入帳本</button>
            </div>
          </div>
        </div>

        {/* 歷史紀錄列表 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-widest">
            <span>📜 歷史存摺</span>
            <button onClick={() => setShowExportModal(true)} className="text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full flex items-center gap-1">
              <Download size={14}/> 匯出備份
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="text-[10px] text-slate-300 bg-slate-50 font-black uppercase">
                <tr>
                  <th className="p-4">受難日期</th>
                  <th className="p-4 text-center">上下班時間</th>
                  <th className="p-4 text-center">時薪</th>
                  <th className="p-4 text-center">工時</th>
                  <th className="p-4 text-center">1.34 / 1.67</th>
                  <th className="p-4 text-right">補償金額</th>
                  <th className="p-4 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-4 font-bold text-slate-600">{r.date}</td>
                    <td className="p-4 text-center text-slate-500 font-medium">
                      <div className="flex items-center justify-center gap-1">
                        <Clock size={12} className="text-slate-300"/>
                        {r.checkIn} - {r.checkOut}
                      </div>
                    </td>
                    <td className="p-4 text-center text-slate-400">
                      <div className="flex items-center justify-center gap-0.5">
                        <DollarSign size={12}/>
                        {r.appliedRate}
                      </div>
                    </td>
                    <td className="p-4 text-center font-medium">{(r.regularHours + r.overtimeTotal).toFixed(2)}h</td>
                    <td className="p-4 text-center text-xs font-bold text-orange-500">{r.overtimeTotal > 0 ? `${r.overtime1.toFixed(2)} / ${r.overtime2.toFixed(2)}` : '-'}</td>
                    <td className="p-4 text-right font-black text-emerald-600">
                      {showPrivateData ? `NT$ ${r.salary?.toLocaleString()}` : 'NT$ ****'}
                    </td>
                    <td className="p-4 text-right">
                      <button onClick={() => {setDeleteTarget(r); setShowDeleteModal(true)}} className="text-slate-200 hover:text-red-300"><Trash2 size={16}/></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 設定彈窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-2xl space-y-6">
            <h2 className="font-black text-slate-800 border-b pb-2 flex items-center gap-2"><Calendar size={18}/> 帳本進階設定</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">預設時薪</label>
                <input type="number" value={settings.hourlyRate} onChange={e => {const s={...settings, hourlyRate:Number(e.target.value)}; setSettings(s); saveData(null, s);}} className="w-full p-3 rounded-xl bg-slate-50 font-black text-emerald-700 outline-none border border-transparent focus:border-emerald-500"/>
              </div>
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">預設休息(分)</label>
                <select value={settings.defaultBreak} onChange={e => {const s={...settings, defaultBreak:Number(e.target.value)}; setSettings(s); saveData(null, s); setNewRecord(prev=>({...prev, breakMinutes:Number(e.target.value)}));}} className="w-full p-3 rounded-xl bg-slate-50 font-black text-slate-600 outline-none border border-transparent focus:border-emerald-500">
                  {breakOptions.map(opt => <option key={opt} value={opt}>{opt}m</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-2 border-t pt-4">
              <label className="text-[10px] font-black text-red-400 uppercase block">資料清理區</label>
              <button onClick={() => setShowRangeDeleteModal(true)} className="w-full py-2 bg-white text-red-500 border border-red-200 rounded-xl font-bold text-xs hover:bg-red-50 transition-colors">🗑️ 依日期區間刪除資料</button>
              <button onClick={() => setShowDeleteAllModal(true)} className="w-full py-2 bg-red-50 text-red-600 rounded-xl font-bold text-xs hover:bg-red-100 transition-colors">🔥 毀滅性清空所有紀錄</button>
            </div>

            <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">儲存並離開</button>
          </div>
        </div>
      )}

      {/* 匯出備份彈窗 */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <h3 className="text-lg font-black text-slate-800">匯出自由記錄</h3>
            
            <button onClick={() => copyToClipboard(records)} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black flex items-center justify-center gap-2">
              <Copy size={18}/> 複製全部資料
            </button>

            <div className="border-t pt-4 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">或匯出特定區間</p>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" className="p-2 bg-slate-50 rounded-lg text-xs" onChange={e => setDateRange({...dateRange, start: e.target.value})}/>
                <input type="date" className="p-2 bg-slate-50 rounded-lg text-xs" onChange={e => setDateRange({...dateRange, end: e.target.value})}/>
              </div>
              <button 
                disabled={!dateRange.start || !dateRange.end}
                onClick={() => {
                  const filtered = records.filter(r => r.date >= dateRange.start && r.date <= dateRange.end);
                  copyToClipboard(filtered);
                }}
                className="w-full py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs disabled:opacity-50"
              >
                複製選定區間
              </button>
            </div>
            
            <button onClick={() => setShowExportModal(false)} className="w-full py-2 text-slate-400 font-bold text-sm">關閉</button>
          </div>
        </div>
      )}

      {/* 區間刪除確認彈窗 */}
      {showRangeDeleteModal && (
        <div className="fixed inset-0 bg-red-900/20 backdrop-blur-md flex items-center justify-center z-[70] p-4">
          <div className="bg-white p-6 rounded-3xl max-w-sm w-full shadow-2xl border-t-8 border-red-400 space-y-4">
            <h3 className="text-lg font-black text-slate-800">選擇要刪除的區間</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-left"><label className="text-[10px] font-bold text-slate-400 ml-1">開始日期</label><input type="date" className="w-full p-2 bg-slate-50 rounded-lg text-sm" onChange={e => setDateRange({...dateRange, start: e.target.value})}/></div>
              <div className="text-left"><label className="text-[10px] font-bold text-slate-400 ml-1">結束日期</label><input type="date" className="w-full p-2 bg-slate-50 rounded-lg text-sm" onChange={e => setDateRange({...dateRange, end: e.target.value})}/></div>
            </div>
            <div className="flex gap-2">
              <button disabled={!dateRange.start || !dateRange.end} onClick={deleteByRange} className="flex-[2] py-3 bg-red-500 text-white rounded-xl font-black disabled:opacity-50">執行刪除</button>
              <button onClick={() => setShowRangeDeleteModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-bold">取消</button>
            </div>
          </div>
        </div>
      )}

      {/* 毀滅性全刪確認 */}
      {showDeleteAllModal && (
        <div className="fixed inset-0 bg-red-900/40 backdrop-blur-md flex items-center justify-center z-[70] p-4 text-center">
          <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl border-t-8 border-red-600">
            <AlertTriangle className="mx-auto text-red-600 mb-4" size={48}/>
            <h3 className="text-xl font-black text-slate-800 mb-2">確定要抹除全部資料？</h3>
            <div className="flex gap-3">
                <button onClick={clearAllRecords} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black">徹底清空</button>
                <button onClick={() => setShowDeleteAllModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold">我點錯了</button>
            </div>
          </div>
        </div>
      )}

      {/* 單筆刪除確認 */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full text-center">
            <h3 className="font-black text-slate-800 mb-6 text-sm">要刪除這筆紀錄嗎？</h3>
            <div className="flex gap-3">
              <button onClick={() => { const updated = records.filter(r => r.id !== deleteTarget.id); setRecords(updated); saveData(updated, null); setShowDeleteModal(false); }} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-black">刪除</button>
              <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-slate-400">保留</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTracker;

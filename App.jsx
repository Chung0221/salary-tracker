import React, { useState, useEffect } from 'react';
import { Download, Trash2, Eye, EyeOff, Copy, ShieldAlert, ThumbsUp, RefreshCw, Leaf } from 'lucide-react';

const SalaryTracker = () => {
  const [records, setRecords] = useState([]);
  const [settings, setSettings] = useState({
    hourlyRate: 196,
    overtimeRate1: 1.34,
    overtimeRate2: 1.67,
    settlementDay: 25
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
    const randomSlogan = slogans[Math.floor(Math.random() * slogans.length)];
    setCurrentSlogan(randomSlogan);
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
    setLastAddedInfo(newRecord.date);
    setTimeout(() => setLastAddedInfo(null), 3000);
  };

  const totals = records.reduce((acc, r) => ({
    salary: acc.salary + (r.salary || 0),
    ot1: acc.ot1 + (r.overtime1 || 0),
    ot2: acc.ot2 + (r.overtime2 || 0),
    otTotal: acc.otTotal + (r.overtimeTotal || 0)
  }), { salary: 0, ot1: 0, ot2: 0, otTotal: 0 });

  const copyForSheets = () => {
    let tsv = "日期\t上班\t下班\t休息(分)\t時薪\t總工時\t1.34加班\t1.67加班\t總加班時數\t薪資(精神賠償)\t備註\n";
    [...records].reverse().forEach(r => {
      tsv += `${r.date}\t${r.checkIn}\t${r.checkOut}\t${r.breakMinutes}\t${r.appliedRate}\t${(r.regularHours+r.overtimeTotal).toFixed(1)}\t${r.overtime1.toFixed(1)}\t${r.overtime2.toFixed(1)}\t${r.overtimeTotal.toFixed(1)}\t${r.salary}\t${r.note}\n`;
    });
    tsv += `\n[當月結算]\t\t\t\t\t\t${totals.ot1.toFixed(1)}\t${totals.ot2.toFixed(1)}\t${totals.otTotal.toFixed(1)}\t${totals.salary}\t願自由如風👍\n`;
    navigator.clipboard.writeText(tsv);
    alert('👍 匯出成功！願利息如春雨，悄悄入帳。');
    setShowExportModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto space-y-4">
        
        {/* 頂部數據 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex flex-wrap justify-between items-center gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <h1 className="text-xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
              <Leaf className="text-emerald-500" size={24}/>
              清心自由基金帳本
            </h1>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-400 font-bold uppercase">預計入帳總額</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-emerald-600">
                  {showPrivateData ? `NT$ ${totals.salary.toLocaleString()}` : 'NT$ ****'}
                </span>
                <button onClick={() => setShowPrivateData(!showPrivateData)} className="text-slate-400">
                  {showPrivateData ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors">⚙️ 調整參數</button>
        </div>

        {/* 雲淡風輕口號區域 (晨曦綠) */}
        <div className="bg-emerald-50 rounded-2xl border border-emerald-100 p-6 flex items-center gap-4 shadow-sm">
            <div className="p-2 bg-emerald-500 rounded-full shrink-0">
                <Leaf size={20} className="text-white"/>
            </div>
            <p className="text-emerald-800 font-bold text-base md:text-lg leading-relaxed">
                {currentSlogan}
            </p>
        </div>

        {/* 輸入區域 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">日期</span>
              <input type="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="w-full p-2 bg-slate-50 rounded-lg border-none focus:ring-2 focus:ring-emerald-500"/>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">時段</span>
              <div className="flex gap-1">
                <select value={timeIn.h} onChange={e => setTimeIn({...timeIn, h: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border-none">
                  {Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}
                </select>
                <select value={timeOut.h} onChange={e => setTimeOut({...timeOut, h: e.target.value})} className="flex-1 p-2 bg-slate-50 rounded-lg border-none">
                  {Array.from({length:24},(_,i)=>i.toString().padStart(2,'0')).map(h=><option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">性質 / 休息</span>
              <div className="flex gap-1">
                <select value={newRecord.note} onChange={e => setNewRecord({...newRecord, note: e.target.value})} className="flex-[2] p-2 bg-slate-50 rounded-lg border-none font-bold text-emerald-600">
                  <option value="">例行紀錄</option>
                  <option value="休出">假日加班</option>
                  <option value="雙薪">雙薪加乘</option>
                  <option value="病假">身心修復</option>
                </select>
                <select value={newRecord.breakMinutes} onChange={e => setNewRecord({...newRecord, breakMinutes: Number(e.target.value)})} className="flex-1 p-2 bg-slate-50 rounded-lg border-none">
                  <option value={60}>60m</option>
                  <option value={0}>0m</option>
                </select>
              </div>
            </div>
            <div className="pt-5">
              <button onClick={addRecord} className="w-full bg-slate-800 text-white py-2 rounded-lg font-black hover:bg-black transition-all shadow-md">錄入帳本</button>
            </div>
          </div>
          {lastAddedInfo && (
            <div className="mt-4 bg-emerald-50 text-emerald-700 p-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 border border-emerald-100 animate-pulse">
                <ThumbsUp size={14}/> <span>一筆豐盈的種子已播下：{lastAddedInfo}</span>
            </div>
          )}
        </div>

        {/* 歷史清單 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b flex justify-between items-center text-xs font-black text-slate-400">
            <span className="tracking-widest uppercase">📜 自由基金歷史存摺</span>
            <button onClick={() => setShowExportModal(true)} className="text-emerald-600 flex items-center gap-1 hover:bg-white px-3 py-1 rounded-full border border-emerald-200"><Download size={14}/> 匯出</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[650px]">
              <thead className="text-[10px] text-slate-300 bg-slate-50 font-black uppercase tracking-tighter">
                <tr>
                  <th className="p-4">受難日期</th>
                  <th className="p-4 text-center">時薪</th>
                  <th className="p-4 text-center">工時</th>
                  <th className="p-4 text-center">加班加成</th>
                  <th className="p-4 text-right">補償金額</th>
                  <th className="p-4 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm">
                {records.map(r => (
                  <tr key={r.id} className="hover:bg-emerald-50/30 transition-colors">
                    <td className="p-4 font-bold text-slate-600">{r.date}<div className="text-[10px] text-slate-400 font-normal">{r.checkIn}-{r.checkOut}</div></td>
                    <td className="p-4 text-center text-slate-400">NT$ {r.appliedRate}</td>
                    <td className="p-4 text-center font-medium">{(r.overtimeTotal + r.regularHours).toFixed(1)}h</td>
                    <td className="p-4 text-center text-xs font-bold text-orange-500">{r.overtimeTotal > 0 ? `${r.overtime1.toFixed(1)} / ${r.overtime2.toFixed(1)}` : '-'}</td>
                    <td className="p-4 text-right font-black text-emerald-600">{showPrivateData ? `NT$ ${r.salary?.toLocaleString()}` : 'NT$ ****'}</td>
                    <td className="p-4 text-right">
                      <button onClick={() => {setDeleteTarget(r); setShowDeleteModal(true)}} className="text-slate-200 hover:text-red-300 p-1"><Trash2 size={16}/></button>
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
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="mx-auto w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                <Copy size={24}/>
            </div>
            <h3 className="text-lg font-black mb-2 text-slate-800">準備匯出自由記錄</h3>
            <p className="text-xs text-slate-400 mb-6 leading-relaxed">包含 1.34 / 1.67 加班總結，<br/>願這些數字化作你離開的羽翼。</p>
            <button onClick={copyForSheets} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all">複製到剪貼簿</button>
            <button onClick={() => setShowExportModal(false)} className="w-full py-4 text-slate-400 font-bold mt-2">再等等</button>
          </div>
        </div>
      )}

      {/* 時薪設定彈窗 */}
      {showSettings && (
        <div className="fixed inset-0 bg-slate-900/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl max-w-xs w-full shadow-2xl">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">設定每小時補償金額</label>
            <input type="number" value={settings.hourlyRate} onChange={e => {const s={...settings, hourlyRate:Number(e.target.value)}; setSettings(s); saveData(null, s);}} className="w-full p-4 rounded-xl bg-slate-50 font-black text-emerald-700 text-2xl outline-none mb-4"/>
            <button onClick={() => setShowSettings(false)} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold">確認儲存</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalaryTracker;

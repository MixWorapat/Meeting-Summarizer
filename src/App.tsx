import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Calendar, MapPin, Users, List, FileImage, Loader2, Plus, Clock, Info, Copy, Check, ArrowLeft, ExternalLink, Pencil, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { extractMeetingDetails, MeetingDetails } from './services/geminiService';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [additionalDetails, setAdditionalDetails] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState<MeetingDetails | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editedDetails, setEditedDetails] = useState<MeetingDetails | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf' || selectedFile.type.startsWith('image/')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('กรุณาอัปโหลดไฟล์ PDF หรือรูปภาพเท่านั้น');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (droppedFile.type === 'application/pdf' || droppedFile.type.startsWith('image/')) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError('กรุณาอัปโหลดไฟล์ PDF หรือรูปภาพเท่านั้น');
      }
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('กรุณาอัปโหลดไฟล์ก่อน');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const base64Data = await fileToBase64(file);
      const details = await extractMeetingDetails(base64Data, file.type, additionalDetails);
      setMeetingDetails(details);
      setEditedDetails(details);
      setShowSummary(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'ไม่สามารถสรุปข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCopy = () => {
    if (!editedDetails) return;
    
    const text = `
หัวข้อ: ${editedDetails.topic}
วันที่: ${editedDetails.date}
เวลา: ${editedDetails.startTime} - ${editedDetails.endTime}
สถานที่/ลิงก์: ${editedDetails.location}
ผู้เข้าร่วม: ${editedDetails.attendees.join(', ')}
วาระการประชุม:
${editedDetails.agenda.map(a => `- ${a}`).join('\n')}
หมายเหตุ: ${editedDetails.notes}
    `.trim();

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleReset = () => {
    setFile(null);
    setMeetingDetails(null);
    setEditedDetails(null);
    setShowSummary(false);
    setIsEditing(false);
    setAdditionalDetails('');
  };

  const handleEditToggle = () => {
    if (isEditing) {
      // Save
      setMeetingDetails(editedDetails);
    }
    setIsEditing(!isEditing);
  };

  const updateEditedField = (field: keyof MeetingDetails, value: any) => {
    if (!editedDetails) return;
    setEditedDetails({ ...editedDetails, [field]: value });
  };

  const generateGoogleCalendarUrl = (details: MeetingDetails) => {
    const { topic, date, startTime, endTime, location, notes, agenda } = details;
    const formatDateTime = (d: string, t: string) => {
      if (!d || !t) return '';
      const cleanDate = d.replace(/-/g, '');
      const cleanTime = t.replace(/:/g, '') + '00';
      return `${cleanDate}T${cleanTime}`;
    };

    const startDateTime = formatDateTime(date, startTime);
    const endDateTime = formatDateTime(date, endTime) || startDateTime;
    const dates = startDateTime && endDateTime ? `${startDateTime}/${endDateTime}` : '';
    
    let description = notes ? `หมายเหตุ:\n${notes}\n\n` : '';
    if (agenda && agenda.length > 0) {
      description += `วาระการประชุม:\n${agenda.map(a => `- ${a}`).join('\n')}`;
    }

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: topic || 'การประชุม',
      dates: dates,
      details: description,
      location: location || '',
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] text-[#1a1a1a] font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Processing Modal */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8 max-w-sm w-full text-center space-y-6"
            >
              <div className="relative w-20 h-20 mx-auto">
                <div className="absolute inset-0 border-4 border-indigo-50 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ repeat: Infinity, duration: 2 }}
                  >
                    <FileText className="w-8 h-8 text-indigo-600" />
                  </motion.div>
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-gray-900">กำลังประมวลผลด้วย AI</h3>
                <p className="text-sm text-gray-500">
                  Gemini กำลังอ่านเอกสารและสรุปข้อมูลสำคัญให้คุณ กรุณารอสักครู่...
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="flex items-center gap-2"
          >
            <motion.div 
              whileHover={{ rotate: 15 }}
              className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm"
            >
              <Calendar className="w-4 h-4" />
            </motion.div>
            <h1 className="text-base font-bold tracking-tight text-gray-900">Meeting Summarizer</h1>
          </motion.div>
          <AnimatePresence>
            {showSummary && (
              <motion.button 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                whileHover={{ x: -2 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleReset}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                อัปโหลดใหม่
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-4 md:py-6">
        <AnimatePresence mode="wait">
          {!showSummary ? (
            <motion.div
              key="upload-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="text-center space-y-1">
                <h2 className="text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
                  สรุปบันทึกเชิญประชุม
                </h2>
                <p className="text-xs text-gray-500 max-w-md mx-auto">
                  อัปโหลดหนังสือเชิญประชุม แล้วให้ AI ช่วยสรุปข้อมูลสำคัญและลงปฏิทินให้คุณโดยอัตโนมัติ
                </p>
              </div>

              <div className="bg-white rounded-2xl shadow-xl shadow-indigo-100/30 border border-gray-100 p-4 md:p-6 space-y-4">
                <div 
                  className={`relative group border-2 border-dashed rounded-xl p-6 text-center transition-all duration-300 ${file ? 'border-indigo-500 bg-indigo-50/20' : 'border-gray-200 hover:border-indigo-400 bg-gray-50/30'}`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="application/pdf,image/*" 
                    className="hidden" 
                  />
                  
                  <AnimatePresence mode="wait">
                    {file ? (
                      <motion.div 
                        key="file-selected"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <div className="w-12 h-12 bg-white shadow-sm text-indigo-600 rounded-xl flex items-center justify-center">
                          {file.type === 'application/pdf' ? <FileText className="w-6 h-6" /> : <FileImage className="w-6 h-6" />}
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-gray-900">{file.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                        <button 
                          onClick={() => setFile(null)}
                          className="text-[10px] text-red-500 hover:text-red-600 font-bold underline underline-offset-4"
                        >
                          ลบไฟล์และเลือกใหม่
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="no-file"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-3"
                      >
                        <div className="w-12 h-12 bg-white shadow-md shadow-indigo-100 rounded-2xl flex items-center justify-center text-indigo-500">
                          <UploadCloud className="w-6 h-6" />
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-sm font-bold text-gray-900">คลิกเพื่ออัปโหลด หรือลากไฟล์มาวาง</p>
                          <p className="text-[10px] text-gray-400">PDF, PNG, JPG หรือ WEBP (สูงสุด 10MB)</p>
                        </div>
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-bold hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                        >
                          เลือกไฟล์จากเครื่อง
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="additional-details" className="block text-[10px] font-bold text-gray-700 ml-1">
                    รายละเอียดเพิ่มเติม (ไม่บังคับ)
                  </label>
                  <textarea
                    id="additional-details"
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 p-3 text-xs focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 outline-none transition-all resize-none bg-gray-50/30"
                    placeholder="เช่น 'เน้นวาระที่ 2 เป็นพิเศษ'..."
                    value={additionalDetails}
                    onChange={(e) => setAdditionalDetails(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="p-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-medium border border-red-100 flex items-center gap-2">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <motion.button
                  whileTap={{ scale: 0.99 }}
                  onClick={handleSubmit}
                  disabled={!file || isProcessing}
                  className="w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      กำลังประมวลผล...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" />
                      สรุปรายละเอียดการประชุม
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="summary-section"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-indigo-600 font-bold text-[9px] uppercase tracking-widest">
                    AI Summary Result
                  </span>
                  <h2 className="text-xl font-extrabold tracking-tight text-gray-900">
                    สรุปข้อมูลการประชุม
                  </h2>
                </div>
                <div className="flex items-center gap-2">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleEditToggle}
                    className={`flex-1 md:flex-none px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${isEditing ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}
                  >
                    {isEditing ? <Save className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                    {isEditing ? 'บันทึก' : 'แก้ไข'}
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={handleCopy}
                    className="flex-1 md:flex-none px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[10px] font-bold hover:bg-gray-50 transition-all shadow-sm flex items-center justify-center gap-1.5 text-gray-700"
                  >
                    {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                    {copied ? 'คัดลอกแล้ว' : 'คัดลอกสรุป'}
                  </motion.button>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 bg-indigo-50/20">
                  {isEditing ? (
                    <input
                      type="text"
                      className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-base font-extrabold text-gray-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={editedDetails?.topic}
                      onChange={(e) => updateEditedField('topic', e.target.value)}
                    />
                  ) : (
                    <h3 className="text-base font-extrabold text-gray-900 leading-tight">
                      {meetingDetails?.topic || 'ไม่มีหัวข้อการประชุม'}
                    </h3>
                  )}
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors ${!isEditing ? 'hover:bg-gray-50' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">วันที่</p>
                        {isEditing ? (
                          <input
                            type="date"
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={editedDetails?.date}
                            onChange={(e) => updateEditedField('date', e.target.value)}
                          />
                        ) : (
                          <p className="text-xs font-bold text-gray-900">{meetingDetails?.date || 'ไม่ระบุ'}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors ${!isEditing ? 'hover:bg-gray-50' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Clock className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">เวลา</p>
                        {isEditing ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              className="w-16 bg-white border border-gray-200 rounded px-2 py-1 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                              value={editedDetails?.startTime}
                              onChange={(e) => updateEditedField('startTime', e.target.value)}
                              placeholder="00:00"
                            />
                            <span className="text-gray-400">-</span>
                            <input
                              type="text"
                              className="w-16 bg-white border border-gray-200 rounded px-2 py-1 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                              value={editedDetails?.endTime}
                              onChange={(e) => updateEditedField('endTime', e.target.value)}
                              placeholder="00:00"
                            />
                          </div>
                        ) : (
                          <p className="text-xs font-bold text-gray-900">
                            {meetingDetails?.startTime || 'รอระบุ'} {meetingDetails?.endTime ? `- ${meetingDetails?.endTime}` : ''}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className={`flex items-start gap-2.5 p-2.5 rounded-xl transition-colors sm:col-span-2 ${!isEditing ? 'hover:bg-gray-50' : ''}`}>
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 flex-1">
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">สถานที่ / ลิงก์</p>
                        {isEditing ? (
                          <input
                            type="text"
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs font-bold text-gray-900 focus:ring-1 focus:ring-indigo-500 outline-none"
                            value={editedDetails?.location}
                            onChange={(e) => updateEditedField('location', e.target.value)}
                          />
                        ) : (
                          <p className="text-xs font-bold text-gray-900 leading-relaxed">{meetingDetails?.location || 'ไม่ระบุ'}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {editedDetails?.attendees && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5 text-indigo-500" />
                          <h4 className="text-[9px] font-bold text-gray-900 uppercase tracking-widest">ผู้เข้าร่วมประชุม</h4>
                        </div>
                        {isEditing ? (
                          <textarea
                            className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            rows={2}
                            value={editedDetails.attendees.join(', ')}
                            onChange={(e) => updateEditedField('attendees', e.target.value.split(',').map(s => s.trim()))}
                            placeholder="แยกชื่อด้วยเครื่องหมายจุลภาค (,)"
                          />
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {meetingDetails?.attendees.map((attendee, i) => (
                              <span 
                                key={i} 
                                className="px-2.5 py-0.5 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-full border border-gray-200"
                              >
                                {attendee}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {editedDetails?.agenda && (
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <List className="w-3.5 h-3.5 text-indigo-500" />
                          <h4 className="text-[9px] font-bold text-gray-900 uppercase tracking-widest">วาระการประชุม</h4>
                        </div>
                        <div className="bg-gray-50/30 rounded-xl p-4 border border-gray-100">
                          {isEditing ? (
                            <textarea
                              className="w-full bg-white border border-gray-200 rounded-lg p-2.5 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                              rows={3}
                              value={editedDetails.agenda.join('\n')}
                              onChange={(e) => updateEditedField('agenda', e.target.value.split('\n').filter(s => s.trim()))}
                              placeholder="หนึ่งวาระต่อหนึ่งบรรทัด"
                            />
                          ) : (
                            <ul className="space-y-2">
                              {meetingDetails?.agenda.map((item, i) => (
                                <li 
                                  key={i} 
                                  className="text-gray-700 flex items-start gap-2"
                                >
                                  <span className="w-4 h-4 rounded-full bg-white border border-gray-200 flex items-center justify-center text-[8px] font-bold text-indigo-500 shrink-0 mt-0.5">
                                    {i + 1}
                                  </span>
                                  <span className="text-xs font-medium leading-relaxed">{item}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    )}

                    {editedDetails?.notes !== undefined && (
                      <div className="pt-4 border-t border-gray-100 space-y-1.5">
                        <h4 className="text-[9px] font-bold text-gray-900 uppercase tracking-widest">หมายเหตุเพิ่มเติม</h4>
                        {isEditing ? (
                          <textarea
                            className="w-full bg-white border border-gray-200 rounded-xl p-2.5 text-xs font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                            rows={2}
                            value={editedDetails.notes}
                            onChange={(e) => updateEditedField('notes', e.target.value)}
                          />
                        ) : (
                          <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-medium">
                            {meetingDetails?.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-gray-100 space-y-3">
                    <h4 className="text-center text-[9px] font-bold text-gray-400 uppercase tracking-widest">ลงบันทึกการเชิญประชุม</h4>
                    <div className="flex justify-center">
                      <motion.a
                        whileTap={{ scale: 0.98 }}
                        href={generateGoogleCalendarUrl(editedDetails!)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center gap-2.5 p-2.5 bg-white border border-gray-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50/20 transition-all duration-300 shadow-sm w-full sm:max-w-xs"
                      >
                        <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                          <Calendar className="w-3.5 h-3.5" />
                        </div>
                        <div className="text-left">
                          <p className="text-[10px] font-bold text-gray-900">Google Calendar</p>
                          <p className="text-[8px] text-gray-400">ลงปฏิทินกูเกิล</p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-gray-300 ml-auto" />
                      </motion.a>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );

}

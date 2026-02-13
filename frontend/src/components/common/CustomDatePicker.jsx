import { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

const CustomDatePicker = ({ value, onChange, label, required, maxDate }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(new Date()); // Current view in calendar
    const [viewMode, setViewMode] = useState('days'); // 'days', 'months', 'years'
    const containerRef = useRef(null);
    const calendarRef = useRef(null);
    const [position, setPosition] = useState('bottom'); // 'top' or 'bottom'

    // Initialize viewDate from value prop
    useEffect(() => {
        if (value) {
            const date = new Date(value);
            if (!isNaN(date.getTime())) {
                setViewDate(date);
            }
        }
    }, [isOpen, value]); // Reset when opening or value changes

    // Calculate position (above or below input)
    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const calendarHeight = 400; // Approximate calendar height
            
            if (spaceBelow < calendarHeight && spaceAbove > spaceBelow) {
                setPosition('top');
            } else {
                setPosition('bottom');
            }
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Handle Today button
    const handleToday = () => {
        const today = new Date();
        const offset = today.getTimezoneOffset();
        const localDate = new Date(today.getTime() - (offset * 60 * 1000));
        const todayStr = localDate.toISOString().split('T')[0];
        
        if (!maxDate || new Date(todayStr) <= new Date(maxDate)) {
            onChange(todayStr);
            setViewDate(today);
            setIsOpen(false);
        }
    };

    // Helper functions
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const formatDateDisplay = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    const handleDateSelect = (day) => {
        const selectedDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        // Correct for timezone offset to ensure YYYY-MM-DD matches local date selection
        const offset = selectedDate.getTimezoneOffset();
        const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
        onChange(localDate.toISOString().split('T')[0]);
        setIsOpen(false);
    };

    const handlePrevMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    };

    const handleNextMonth = () => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
    };

    const changeYear = (year) => {
        const newDate = new Date(viewDate);
        newDate.setFullYear(year);
        setViewDate(newDate);
        setViewMode('months');
    };

    const selectMonth = (monthIndex) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(monthIndex);
        setViewDate(newDate);
        setViewMode('days');
    };

    const YEARS_TO_SHOW = 120; // How far back to go
    const generateYears = () => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: YEARS_TO_SHOW }, (_, i) => currentYear - i);
    };

    // Render calendar days
    const renderDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        
        const daysArray = [];

        // Empty slots for days before the 1st
        for (let i = 0; i < firstDay; i++) {
            daysArray.push(<div key={`empty-${i}`} className="w-full aspect-square"></div>);
        }

        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const currentDayDate = new Date(year, month, day);
            const offset = currentDayDate.getTimezoneOffset();
            const localDate = new Date(currentDayDate.getTime() - (offset * 60 * 1000));
            const dateStr = localDate.toISOString().split('T')[0];
            
            const isSelected = value === dateStr;
            const isToday = new Date().toDateString() === currentDayDate.toDateString();
            const isFuture = maxDate && new Date(dateStr) > new Date(maxDate);

            daysArray.push(
                <button
                    key={day}
                    type="button"
                    disabled={isFuture}
                    onClick={() => !isFuture && handleDateSelect(day)}
                    className={`
                        w-full aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-all
                        ${isSelected
                            ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700'
                            : isFuture
                                ? 'text-slate-300 cursor-not-allowed bg-slate-50'
                                : isToday
                                    ? 'bg-indigo-100 text-indigo-700 border-2 border-indigo-400 font-semibold hover:bg-indigo-200'
                                    : 'text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                        }
                    `}
                >
                    {day}
                </button>
            );
        }

        return daysArray;
    };

    return (
        <div className="relative" ref={containerRef}>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                <CalendarIcon size={16} className="text-green-500" />
                {label} {required && <span className="text-red-500">*</span>}
            </label>

            {/* Input Trigger */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full px-4 py-3 rounded-xl border bg-white flex items-center justify-between cursor-pointer transition-all duration-200
                    ${isOpen ? 'border-indigo-500 ring-4 ring-indigo-500/10' : 'border-slate-200 hover:border-slate-300'}
                `}
            >
                <span className={value ? 'text-slate-900 font-medium' : 'text-slate-400'}>
                    {value ? formatDateDisplay(value) : 'Select a date'}
                </span>
                <div className="flex items-center gap-2">
                    {value && (
                        <div
                            onClick={(e) => { e.stopPropagation(); onChange(''); }}
                            className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-red-500 transition-colors"
                        >
                            <X size={16} />
                        </div>
                    )}
                    <CalendarIcon size={18} className="text-slate-400" />
                </div>
            </div>

            {/* Dropdown Calendar */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        ref={calendarRef}
                        initial={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: position === 'top' ? 10 : -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`absolute z-50 ${position === 'top' ? 'bottom-full mb-2' : 'top-full mt-2'} w-full sm:w-[340px] bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden`}
                    >
                        {/* Header */}
                        {viewMode === 'days' && (
                            <div className="bg-white p-4 border-b border-slate-200">
                                <div className="flex items-center justify-between mb-3">
                                    <button
                                        type="button"
                                        onClick={handlePrevMonth}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all hover:scale-110"
                                        title="Previous month"
                                    >
                                        <ChevronLeft size={18} />
                                    </button>
                                    <div className="flex gap-2 items-center">
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('months')}
                                            className="font-semibold text-base text-slate-800 hover:bg-slate-100 px-3 py-1 rounded-lg transition-all"
                                        >
                                            {months[viewDate.getMonth()]}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setViewMode('years')}
                                            className="font-semibold text-base text-slate-800 hover:bg-slate-100 px-3 py-1 rounded-lg transition-all"
                                        >
                                            {viewDate.getFullYear()}
                                        </button>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleNextMonth}
                                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-600 transition-all hover:scale-110"
                                        title="Next month"
                                    >
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                                
                                {/* Quick Actions */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={handleToday}
                                        className="flex-1 px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-indigo-50 text-indigo-700 rounded-lg transition-all border border-slate-200 hover:border-indigo-300 flex items-center justify-center gap-1.5"
                                    >
                                        <Clock size={12} />
                                        Today
                                    </button>
                                    {value && (
                                        <button
                                            type="button"
                                            onClick={(e) => { e.stopPropagation(); onChange(''); }}
                                            className="px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-red-50 text-red-600 rounded-lg transition-all border border-slate-200 hover:border-red-300 flex items-center justify-center gap-1.5"
                                        >
                                            <X size={12} />
                                            Clear
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {viewMode !== 'days' && (
                            <div className="bg-white p-4 border-b border-slate-200">
                                <button
                                    type="button"
                                    onClick={() => setViewMode('days')}
                                    className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 px-2 py-1"
                                >
                                    <ChevronLeft size={14} /> Back to Calendar
                                </button>
                            </div>
                        )}

                        {/* Body */}
                        <div className="p-4">
                            {/* Days View */}
                            {viewMode === 'days' && (
                                <>
                                    <div className="grid grid-cols-7 mb-2 gap-1">
                                        {daysOfWeek.map(d => (
                                            <div key={d} className="text-center text-xs font-semibold text-slate-500 py-2">
                                                {d}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="grid grid-cols-7 gap-1">
                                        {renderDays()}
                                    </div>
                                </>
                            )}

                            {/* Months View */}
                            {viewMode === 'months' && (
                                <div className="grid grid-cols-3 gap-2">
                                    {months.map((m, i) => (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => selectMonth(i)}
                                            className={`
                                                p-3 rounded-lg text-sm font-medium transition-all
                                                ${viewDate.getMonth() === i
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                                }
                                            `}
                                        >
                                            {m.slice(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* Years View */}
                            {viewMode === 'years' && (
                                <div className="grid grid-cols-4 gap-2 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
                                    {generateYears().map(year => (
                                        <button
                                            key={year}
                                            type="button"
                                            onClick={() => changeYear(year)}
                                            className={`
                                                p-2 rounded-lg text-sm font-medium transition-all
                                                ${viewDate.getFullYear() === year
                                                    ? 'bg-indigo-600 text-white shadow-md'
                                                    : 'bg-slate-50 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                                                }
                                            `}
                                        >
                                            {year}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default CustomDatePicker;

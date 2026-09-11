import { useState, useEffect } from "react";
import {
  FaChevronLeft,
  FaChevronRight,
  FaCalendarAlt,
  FaClock,
  FaUserCircle,
  FaTimes,
  FaCheckCircle,
  FaFilter,
  FaPlus,
  FaSpinner,
} from "react-icons/fa";

import Header from "../layouts/Header";
import Sidebar from "../layouts/Sidebar";
import { useSidebar } from "../context/SidebarContext";
import { calendarService } from "../services/calendarService";

const DAYS_OF_WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function CalendarPage() {
  const { collapsed } = useSidebar();
  const realToday = new Date();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState("Month");
  const [statusFilter, setStatusFilter] = useState("All Statuses");
  const [teamFilter, setTeamFilter] = useState("All Teams");
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  useEffect(() => {
    let isMounted = true;
    async function loadEvents() {
      setIsLoading(true);
      try {
        const data = await calendarService.getCalendarEvents({
          month: currentMonth,
          year: currentYear,
          status: statusFilter,
          team: teamFilter,
        });
        if (isMounted && data) {
          setEvents(data);
        }
      } catch (err) {
        console.error("Gagal load calendar events:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }
    loadEvents();
    return () => {
      isMounted = false;
    };
  }, [currentMonth, currentYear, statusFilter, teamFilter]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInCurrentMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);

  const daysInPrevMonth = getDaysInMonth(currentYear, currentMonth - 1);

  const calendarCells = [];

  for (let i = firstDayIndex - 1; i >= 0; i--) {
    calendarCells.push({
      dayNumber: daysInPrevMonth - i,
      isCurrentMonth: false,
      month: currentMonth - 1,
      year: currentYear,
    });
  }

  for (let i = 1; i <= daysInCurrentMonth; i++) {
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: true,
      month: currentMonth,
      year: currentYear,
    });
  }

  const remainingCells = 35 - calendarCells.length > 0 ? 35 - calendarCells.length : 42 - calendarCells.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarCells.push({
      dayNumber: i,
      isCurrentMonth: false,
      month: currentMonth + 1,
      year: currentYear,
    });
  }

  const filteredEvents = events.filter((evt) => {
    const matchStatus = statusFilter === "All Statuses" || evt.status === statusFilter;
    const matchTeam = teamFilter === "All Teams" || evt.team === teamFilter;
    return matchStatus && matchTeam;
  });

  return (
    <div className="bg-gray-50 min-h-screen lg:h-screen lg:overflow-hidden flex flex-col">
      <Header />
      <Sidebar />

      <main className={`pt-16 p-4 sm:p-6 lg:px-8 lg:pb-4 flex-1 flex flex-col overflow-auto lg:overflow-hidden transition-all duration-300 ${collapsed ? "lg:ml-20" : "lg:ml-64"}`}>
        {/* Header Kalender: Baris 1 = Judul, Baris 2 = Kontrol */}
        <div className="shrink-0 flex flex-col gap-3 mb-3 sm:mb-4">
          {/* Baris 1: Judul + Subtitle */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-gray-900 tracking-tight">
                {MONTH_NAMES[currentMonth]} {currentYear}
              </h1>
              <p className="text-gray-400 text-xs font-normal">
                Manage deadlines and employee schedules.
              </p>
            </div>

            {/* Navigasi Bulan (selalu tampil di kanan judul) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                onClick={handleToday}
                className="bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-semibold px-2.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                title="Kembali ke Hari Ini"
              >
                Hari Ini
              </button>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-0.5 shadow-2xs">
                <button
                  onClick={handlePrevMonth}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Bulan Sebelumnya"
                >
                  <FaChevronLeft size={10} />
                </button>
                <div className="h-3.5 w-[1px] bg-gray-200"></div>
                <button
                  onClick={handleNextMonth}
                  className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                  title="Bulan Berikutnya"
                >
                  <FaChevronRight size={10} />
                </button>
              </div>
            </div>
          </div>

          {/* Baris 2: View Switch + Filter (bisa wrap) */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switch: List | Month | Week */}
            <div className="bg-gray-100/90 p-1 rounded-xl flex items-center">
              {["List", "Month", "Week"].map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewType(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    viewType === mode
                      ? "bg-white text-gray-800 shadow-xs border border-gray-100"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Dropdown: All Statuses */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer shadow-2xs"
            >
              <option value="All Statuses">All Statuses</option>
              <option value="Backlog">Backlog</option>
              <option value="Ready">Ready</option>
              <option value="On Progress">On Progress</option>
              <option value="Code Review">Code Review</option>
              <option value="QA">QA</option>
              <option value="Done">Done</option>
            </select>

            {/* Dropdown: All Teams */}
            <select
              value={teamFilter}
              onChange={(e) => setTeamFilter(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-light cursor-pointer shadow-2xs"
            >
              <option value="All Teams">All Teams</option>
              <option value="Engineering">Engineering</option>
              <option value="UI/UX">UI/UX</option>
              <option value="QA">QA</option>
            </select>
          </div>
        </div>

        {/* View Mode: MONTH (Google Calendar Style Grid) */}
        {viewType === "Month" && (
          <div className="flex-1 flex flex-col bg-white rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-sm overflow-x-auto min-h-[500px] lg:min-h-0">
            <div className="min-w-[650px] flex-1 flex flex-col h-full">
              {/* Header Hari: SUN, MON, TUE, WED, THU, FRI, SAT */}
              <div className="shrink-0 grid grid-cols-7 border-b border-gray-200 bg-gray-50/50 text-center text-[10px] font-bold text-gray-500 py-2 tracking-wider">
                {DAYS_OF_WEEK.map((day) => (
                  <div key={day}>{day}</div>
                ))}
              </div>

              {/* Grid Sel Kalender */}
              <div
                className="flex-1 grid grid-cols-7 divide-x divide-y divide-gray-100 min-h-0"
                style={{
                  gridTemplateRows: `repeat(${Math.ceil(calendarCells.length / 7)}, minmax(0, 1fr))`,
                }}
              >
              {calendarCells.map((cell, idx) => {
                const isSelectedToday =
                  cell.isCurrentMonth &&
                  cell.dayNumber === realToday.getDate() &&
                  cell.month === realToday.getMonth() &&
                  cell.year === realToday.getFullYear();

                const cellEvents = filteredEvents.filter(
                  (e) =>
                    e.day === cell.dayNumber &&
                    e.month === cell.month &&
                    e.year === cell.year
                );

                return (
                  <div
                    key={idx}
                    className={`h-full p-1.5 flex flex-col justify-between overflow-hidden transition-colors ${
                      cell.isCurrentMonth ? "bg-white" : "bg-gray-50/40 text-gray-300"
                    } ${
                      isSelectedToday
                        ? "ring-2 ring-inset ring-accent bg-accent/5 rounded-xs"
                        : "hover:bg-gray-50/70"
                    }`}
                  >
                    {/* Baris Atas: Nomor Tanggal & Indikator Titik */}
                    <div className="flex items-center justify-between shrink-0">
                      {isSelectedToday ? (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent ml-0.5"></span>
                      ) : (
                        <span></span>
                      )}

                      <span
                        className={`text-[11px] font-semibold inline-flex items-center justify-center ${
                          isSelectedToday
                            ? "w-5 h-5 rounded-full bg-accent text-white font-bold text-[10px]"
                            : cell.isCurrentMonth
                            ? "text-gray-700 font-semibold"
                            : "text-gray-300"
                        }`}
                      >
                        {cell.dayNumber}
                      </span>
                    </div>

                    {/* Daftar Event / Deadline di Tanggal Ini */}
                    <div className="flex flex-col gap-1 overflow-hidden my-auto">
                      {cellEvents.map((evt) => (
                        <button
                          key={evt.id}
                          onClick={() => setSelectedEvent(evt)}
                          className={`w-full text-left text-[9.5px] font-semibold px-1.5 py-0.5 rounded border transition-all truncate cursor-pointer leading-tight ${evt.color}`}
                          title={`${evt.title} (${evt.assignee} - ${evt.status})`}
                        >
                          {evt.title}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              </div>
            </div>
          </div>
        )}

        {/* View Mode: LIST VIEW */}
        {viewType === "List" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[640px]">
                <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold">
                  <tr>
                    <th className="p-4 whitespace-nowrap">Tanggal</th>
                    <th className="p-4 whitespace-nowrap">Nama Agenda / Deadline</th>
                    <th className="p-4 whitespace-nowrap">Tim & Assignee</th>
                    <th className="p-4 whitespace-nowrap">Kategori</th>
                    <th className="p-4 whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-gray-700">
                  {filteredEvents.map((evt) => (
                    <tr
                      key={evt.id}
                      onClick={() => setSelectedEvent(evt)}
                      className="hover:bg-gray-50/70 transition-colors cursor-pointer"
                    >
                      <td className="p-4 font-bold text-gray-800 whitespace-nowrap">
                        {evt.day} {MONTH_NAMES[evt.month]} {evt.year}
                      </td>
                      <td className="p-4 font-semibold text-gray-900">{evt.title}</td>
                      <td className="p-4 text-gray-600 whitespace-nowrap">
                        <span className="flex items-center gap-1.5">
                          <FaUserCircle className="text-primary shrink-0" /> {evt.assignee} ({evt.team})
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className={`inline-flex items-center text-[11px] font-bold px-2.5 py-1 rounded-full border whitespace-nowrap ${evt.color || "bg-gray-100 text-gray-700 border-gray-200"}`}>
                          {evt.category}
                        </span>
                      </td>
                      <td className="p-4 whitespace-nowrap">
                        <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border bg-primary-light text-primary border-primary/20 whitespace-nowrap">
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* View Mode: WEEK VIEW (Real-time Dinamis) */}
        {viewType === "Week" && (() => {
          const startOfWeek = new Date(currentYear, currentMonth, currentDate.getDate() - currentDate.getDay());
          const weekDays = Array.from({ length: 7 }, (_, i) => {
            const d = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i);
            return {
              dayName: DAYS_OF_WEEK[i],
              dayNumber: d.getDate(),
              monthName: MONTH_NAMES[d.getMonth()].slice(0, 3),
              month: d.getMonth(),
              year: d.getFullYear(),
              isToday:
                d.getDate() === realToday.getDate() &&
                d.getMonth() === realToday.getMonth() &&
                d.getFullYear() === realToday.getFullYear(),
            };
          });

          return (
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-200 shadow-sm p-4 sm:p-6 text-center text-gray-500 text-xs overflow-x-auto">
              <p className="font-semibold text-sm text-gray-800 mb-1">Tampilan Mingguan (Week View)</p>
              <p className="text-gray-400">Menampilkan jadwal sprint untuk minggu berjalan.</p>
              <div className="grid grid-cols-7 gap-3 mt-6 min-w-[650px]">
                {weekDays.map((wd) => {
                  const dayEvents = filteredEvents.filter(
                    (e) => e.day === wd.dayNumber && e.month === wd.month && e.year === wd.year
                  );

                  return (
                    <div
                      key={wd.dayName}
                      className={`p-3 rounded-2xl border min-h-[180px] text-left flex flex-col justify-between ${
                        wd.isToday
                          ? "bg-accent/5 border-accent ring-1 ring-accent"
                          : "bg-gray-50 border-gray-100"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className={`font-bold block text-xs ${wd.isToday ? "text-accent" : "text-gray-700"}`}>
                            {wd.dayName}
                          </span>
                          {wd.isToday && (
                            <span className="text-[9px] bg-accent text-white font-bold px-1.5 py-0.5 rounded-full">
                              Hari Ini
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-gray-400">
                          {wd.dayNumber} {wd.monthName}
                        </span>
                      </div>

                      <div className="flex flex-col gap-1.5 mt-2">
                        {dayEvents.map((evt) => (
                          <button
                            key={evt.id}
                            onClick={() => setSelectedEvent(evt)}
                            className={`p-1.5 rounded-xl text-[10px] font-semibold truncate border cursor-pointer ${evt.color}`}
                          >
                            {evt.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* MODAL: Detail Event / Deadline */}
        {selectedEvent && (
          <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                <span className="text-[11px] font-bold text-accent bg-accent-light px-2.5 py-0.5 rounded-full">
                  {selectedEvent.category}
                </span>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
                >
                  <FaTimes />
                </button>
              </div>

              <div className="py-4">
                <h3 className="font-bold text-base text-gray-800 mb-1">{selectedEvent.title}</h3>
                <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-4">
                  <FaCalendarAlt size={11} /> {selectedEvent.day} {MONTH_NAMES[selectedEvent.month]} {selectedEvent.year}
                </p>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-gray-400">Penanggung Jawab</span>
                    <span className="font-semibold text-gray-700">{selectedEvent.assignee}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-gray-400">Divisi / Tim</span>
                    <span className="font-semibold text-gray-700">{selectedEvent.team}</span>
                  </div>
                  <div className="flex justify-between p-2.5 bg-gray-50 rounded-xl">
                    <span className="text-gray-400">Status Tugas</span>
                    <span className="font-bold text-green-600">{selectedEvent.status}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 text-right">
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-full py-2 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-xl cursor-pointer shadow-sm"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

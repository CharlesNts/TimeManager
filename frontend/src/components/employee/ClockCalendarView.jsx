import React, { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/Badge';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon, AlertCircle } from 'lucide-react';
import { toParis, toISO, dateToISO } from '../../utils/dateUtils';
import { calculateDayStatus, getStatusStyle, isScheduledWorkDay } from '../../utils/workStatusUtils';
import { getEmployeeLeaves } from '../../api/leavesApi';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Get calendar data for a specific month
 * @param {number} year
 * @param {number} month (0-11)
 * @param {Array} clocks - Clock entries (historique, aggregated by day)
 * @param {Object} schedule - Planning de l'équipe
 * @param {Array} approvedLeaves - Approved leaves
 * @returns {Array} Days of the month with status
 */
function getCalendarDays(year, month, clocks, schedule, approvedLeaves) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  // Use Paris timezone for today
  const today = toParis(new Date());
  today.setHours(0, 0, 0, 0);

  // Start from Monday (1) - adjust for Sunday (0)
  let startOffset = firstDay.getDay() - 1;
  if (startOffset === -1) startOffset = 6; // Sunday adjustment

  const days = [];

  // Previous month padding
  for (let i = 0; i < startOffset; i++) {
    days.push({ date: null, status: 'empty' });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    // Create date in Paris timezone
    const currentDate = toParis(new Date(year, month, day));
    const dateStr = dateToISO(currentDate);
    const dayOfWeek = currentDate.getDay();
    const dayData = clocks.find(c => c.date === dateStr);
    const isFuture = currentDate > today;
    const isToday = currentDate.getTime() === today.getTime();

    let status = 'no-data';

    // Weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      status = 'weekend';
    } else if (isFuture) {
      // Future: check if it's a work day
      const isWorkDay = isScheduledWorkDay(currentDate, schedule);

      if (isWorkDay) {
        status = 'planned-work'; // Jour de travail prévu
      } else {
        status = 'no-data';
      }
    } else {
      // Past/Today: only calculate status if we have a schedule
      if (schedule) {
        const dayClocks = dayData ? [dayData] : [];
        status = calculateDayStatus(currentDate, dayClocks, schedule, approvedLeaves);
      } else {
        // No schedule defined - can't determine work status
        status = 'no-data';
      }
    }

    days.push({
      date: day,
      dateStr,
      status,
      data: dayData,
      isFuture,
      isToday
    });
  }

  return days;
}


/**
 * Format minutes to hours
 */
function formatMinutes(minutes) {
  if (!minutes) return '0h 00m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

/**
 * Parse schedule JSON to extract workDays and times
 */
function parseScheduleTemplate(schedule) {
  if (!schedule) return null;

  try {
    let pattern = {};
    if (schedule.weeklyPatternJson) {
      pattern = typeof schedule.weeklyPatternJson === 'string'
        ? JSON.parse(schedule.weeklyPatternJson)
        : schedule.weeklyPatternJson;
    }

    // Map day names to numbers (1=Mon, 2=Tue, ..., 7=Sun)
    const dayMap = {
      mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6, sun: 0
    };

    const workDays = [];
    let startTime = '09:00';
    let endTime = '17:30';

    Object.entries(pattern).forEach(([day, times]) => {
      if (dayMap[day] !== undefined && Array.isArray(times) && times.length > 0) {
        workDays.push(dayMap[day]);
        if (times[0]) {
          const [start, end] = times[0];
          if (start) startTime = start;
          if (end) endTime = end;
        }
      }
    });

    return {
      workDays: workDays.length > 0 ? workDays : [1, 2, 3, 4, 5],
      startTime,
      endTime,
      excludedDates: []
    };
  } catch (e) {
    console.warn('Error parsing schedule:', e);
    return null;
  }
}

/**
 * Aggregate clocks into daily summaries
 */
function aggregateClocksToDaily(clocks) {
  const map = new Map();

  clocks.forEach(clock => {
    if (!clock.clockIn) return;

    try {
      const inDate = new Date(clock.clockIn);
      const inParis = toParis(inDate);
      const dateStr = dateToISO(inDate);

      if (!clock.clockOut) {
        // Session still open, don't count
        return;
      }

      const outDate = new Date(clock.clockOut);
      const outParis = toParis(outDate);
      if (outParis <= inParis) return; // Invalid

      const totalMinutes = Math.round((outParis - inParis) / 60000);
      if (totalMinutes > 12 * 60) return; // Unrealistic

      if (!map.has(dateStr)) {
        map.set(dateStr, {
          date: dateStr,
          clockIn: inParis.toTimeString().slice(0, 5),
          clockOut: outParis.toTimeString().slice(0, 5),
          totalMinutes,
          breaks: 0
        });
      } else {
        const existing = map.get(dateStr);
        existing.totalMinutes += totalMinutes;
      }
    } catch (e) {
      console.warn('Error processing clock:', e);
    }
  });

  return Array.from(map.values());
}

/**
 * ClockCalendarView Component
 * Visual calendar showing clock-in history with color-coded days
 */
export default function ClockCalendarView({ open, onClose, clocks = [], userName = 'Employé', schedule = null, userId = null }) {
  const today = useMemo(() => {
    const t = toParis(new Date());
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [loading, setLoading] = useState(false);
  const [processedClocks, setProcessedClocks] = useState([]);
  const [approvedLeaves, setApprovedLeaves] = useState([]);

  // Parse schedule (don't use defaults - if no schedule exists, it's null)
  const activeSchedule = useMemo(() => {
    if (!schedule) return null;
    return parseScheduleTemplate(schedule) || {
      workDays: [1, 2, 3, 4, 5], // Lun-Ven
      startTime: '09:00',
      endTime: '17:30',
      excludedDates: []
    };
  }, [schedule]);

  // Load clocks and approved leaves
  useEffect(() => {
    if (open && userId) {
      setLoading(true);
      const loadData = async () => {
        try {
          const mod = await import('../../api/clocks.api');
          // Load last 3 months of clocks (using Paris timezone)
          const from = new Date();
          from.setMonth(from.getMonth() - 3);
          const fromISO = toISO(from); // Use toISO for LocalDateTime format
          const toISO_val = toISO(today);

          console.log(`[ClockCalendarView] Loading clocks from ${fromISO} to ${toISO_val} for userId ${userId}`);

          const clocksData = await mod.getClocksInRange(userId, fromISO, toISO_val);
          console.log(`[ClockCalendarView] Loaded ${clocksData?.length || 0} clocks`);

          const daily = aggregateClocksToDaily(clocksData || []);
          console.log(`[ClockCalendarView] Processed into ${daily.length} daily summaries`);
          setProcessedClocks(daily);

          // Load approved leaves
          try {
            const leavesData = await getEmployeeLeaves(userId);
            // Filter only approved leaves
            const approved = leavesData.filter(leave => leave.status === 'APPROVED');
            console.log(`[ClockCalendarView] Loaded ${approved.length} approved leaves`);
            setApprovedLeaves(approved);
          } catch (e) {
            console.warn('[ClockCalendarView] Error loading leaves:', e);
            setApprovedLeaves([]);
          }
        } catch (e) {
          console.error('[ClockCalendarView] Error loading clocks:', e);
          setProcessedClocks([]);
        } finally {
          setLoading(false);
        }
      };
      loadData();
    } else if (clocks.length > 0) {
      // Use provided clocks
      console.log(`[ClockCalendarView] Using provided clocks (${clocks.length} clocks)`);
      const daily = aggregateClocksToDaily(clocks);
      setProcessedClocks(daily);
      setLoading(false);
    }
  }, [open, userId, clocks, today]);

  const calendarDays = useMemo(() => {
    return getCalendarDays(currentYear, currentMonth, processedClocks, activeSchedule, approvedLeaves);
  }, [currentYear, currentMonth, processedClocks, activeSchedule, approvedLeaves]);

  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDay(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDay(null);
  };

  const handleDayClick = (day) => {
    if (day.date && day.status !== 'empty' && day.status !== 'weekend') {
      setSelectedDay(day);
    }
  };

  // Calculate month stats
  const monthStats = useMemo(() => {
    const workDays = calendarDays.filter(d => d.status !== 'empty' && d.status !== 'weekend');
    const pastDays = workDays.filter(d => !d.isFuture);
    const futureDays = workDays.filter(d => d.isFuture);

    const completeDays = pastDays.filter(d => d.status === 'complete').length;
    const partialDays = pastDays.filter(d => d.status === 'partial').length;
    const absentDays = pastDays.filter(d => d.status === 'absent').length;
    const dayOffDays = pastDays.filter(d => d.status === 'day-off').length;
    const plannedWork = futureDays.filter(d => d.status === 'planned-work').length;

    return {
      total: workDays.length,
      past: pastDays.length,
      complete: completeDays,
      partial: partialDays,
      absent: absentDays,
      dayOff: dayOffDays,
      plannedWork
    };
  }, [calendarDays]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="w-4 h-4" />
            Planning - {userName}
          </DialogTitle>
          <DialogDescription>
            Historique des pointages et horaires prévus
          </DialogDescription>
        </DialogHeader>


        <div className="grid grid-cols-1 lg:grid-cols-[1fr,280px] gap-3 overflow-y-auto">
          {/* Left: Calendar */}
          <div className="space-y-2">
            {/* Month Navigation */}
            <div className="flex items-center justify-between bg-gray-50 p-1.5 rounded-lg">
              <Button variant="outline" size="sm" onClick={goToPreviousMonth} className="h-7 w-7 p-0">
                <ChevronLeft className="w-3 h-3" />
              </Button>
              <h3 className="text-sm font-semibold">
                {MONTHS_FR[currentMonth]} {currentYear}
              </h3>
              <Button variant="outline" size="sm" onClick={goToNextMonth} className="h-7 w-7 p-0">
                <ChevronRight className="w-3 h-3" />
              </Button>
            </div>

            {/* Calendar Grid */}
            <div className="bg-white rounded-lg border p-2">
              {/* Days Header */}
              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {DAYS_FR.map((day) => (
                  <div key={day} className="text-center text-[10px] font-semibold text-gray-600 py-0.5">
                    {day}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-0.5">
                {calendarDays.map((day, idx) => {
                  if (day.status === 'empty') {
                    return <div key={idx} className="aspect-square" />;
                  }

                  const style = getStatusStyle(day.status, day.isToday);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleDayClick(day)}
                      className={`
                        aspect-square rounded border-2 p-0.5 flex flex-col items-center justify-center
                        transition-all cursor-pointer text-[10px]
                        ${style.bg} ${style.border} ${style.text}
                        ${(day.data || day.isFuture) && day.status !== 'weekend' ? 'hover:shadow-md hover:scale-105' : ''}
                      `}
                    >
                      <div className="font-semibold">{day.date}</div>
                      {/* Blue dot only for future work days */}
                      {(day.isFuture && day.status === 'planned-work') && day.status !== 'weekend' && (
                        <div className="w-1 h-1 rounded-full mt-0.5 bg-blue-500" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right: Schedule & Details */}
          <div className="space-y-2">
            {/* Horaires Prévus Card */}
            {activeSchedule ? (
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold mb-3 text-sm flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Horaires prévus
                  </h4>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Début</span>
                        <span className="font-mono font-semibold text-blue-700 text-sm">{activeSchedule.startTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Fin</span>
                        <span className="font-mono font-semibold text-blue-700 text-sm">{activeSchedule.endTime}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-600">Durée attendue</span>
                        <span className="font-semibold text-blue-700 text-xs">
                          {(() => {
                            const [sh, sm] = activeSchedule.startTime.split(':').map(Number);
                            const [eh, em] = activeSchedule.endTime.split(':').map(Number);
                            const totalMin = (eh * 60 + em) - (sh * 60 + sm);
                            const h = Math.floor(totalMin / 60);
                            const m = totalMin % 60;
                            return `${h}h ${String(m).padStart(2, '0')}m`;
                          })()}
                        </span>
                      </div>
                    </div>
                    <div className="border-t border-blue-200 pt-2">
                      <span className="text-xs text-gray-600 block mb-2">Jours de travail</span>
                      <div className="flex flex-wrap gap-1">
                        {['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'].map((day, idx) => (
                          <Badge
                            key={day}
                            variant="outline"
                            className={`text-xs ${activeSchedule.workDays.includes(idx + 1) || (idx === 6 && activeSchedule.workDays.includes(0)) ? 'bg-blue-100 text-blue-800 border-blue-300' : 'bg-gray-100 text-gray-600 border-gray-300'}`}
                          >
                            {day}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-amber-900">Aucun planning configuré</p>
                      <p className="text-xs text-amber-700 mt-1">Contactez votre manager pour configurer un planning de travail</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Month Stats */}
            <Card>
              <CardContent className="p-4">
                <h4 className="font-semibold mb-3 text-sm">Statistiques du mois</h4>
                <div className="space-y-3 text-sm">
                  {monthStats.past > 0 && (
                    <>
                      <div className="pb-2 border-b">
                        <div className="text-xs text-gray-500 mb-2">Historique</div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-xs">Complets</span>
                            <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                              {monthStats.complete}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">Partiels</span>
                            <Badge variant="outline" className="bg-orange-50 text-orange-700 text-xs">
                              {monthStats.partial}
                            </Badge>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-xs">Absences</span>
                            <Badge variant="outline" className="bg-red-50 text-red-700 text-xs">
                              {monthStats.absent}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {monthStats.plannedWork > 0 && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">À venir</div>
                      <div className="flex justify-between">
                        <span className="text-xs">Jours prévus</span>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                          {monthStats.plannedWork}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selected Day Details */}
            {selectedDay && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <h4 className="font-semibold text-blue-900 mb-3 text-sm">
                    {selectedDay.date} {MONTHS_FR[currentMonth]}
                  </h4>
                  {selectedDay.isFuture ? (
                    <div className="space-y-2 text-sm">
                      {selectedDay.status === 'planned-work' && (
                        <>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span className="text-xs">Horaires prévus :</span>
                          </div>
                          <div className="text-xs bg-blue-100 p-2 rounded">
                            {activeSchedule.startTime} - {activeSchedule.endTime}
                          </div>
                        </>
                      )}
                    </div>
                  ) : selectedDay.data ? (
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Arrivée</span>
                        <span className="font-medium">{selectedDay.data.clockIn || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Départ</span>
                        <span className="font-medium">{selectedDay.data.clockOut || '—'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total</span>
                        <Badge variant="outline" className="bg-blue-100 text-blue-800 text-xs">
                          {formatMinutes(selectedDay.data.totalMinutes)}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Pauses</span>
                        <span className="font-medium">{selectedDay.data.breaks || 0}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-gray-600">Aucune donnée</div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Loading or Info */}
            {loading && (
              <div className="text-xs text-center text-gray-600 p-2 bg-blue-50 rounded border border-blue-200 flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full border-2 border-blue-300 border-t-blue-600 animate-spin"></div>
                Chargement des données...
              </div>
            )}
            {!loading && processedClocks.length === 0 && (
              <div className="text-xs text-center text-gray-600 p-2 bg-amber-50 rounded border border-amber-200 flex items-center gap-2">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                Aucun pointage trouvé
              </div>
            )}
            {!loading && processedClocks.length > 0 && (
              <div className="text-xs text-center text-gray-500 p-2 bg-gray-50 rounded">
                ✓ {processedClocks.length} jour{processedClocks.length > 1 ? 's' : ''} chargé{processedClocks.length > 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

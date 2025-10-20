import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { ChevronLeft, ChevronRight, Clock, Calendar as CalendarIcon } from 'lucide-react';

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

/**
 * Get calendar data for a specific month
 * @param {number} year 
 * @param {number} month (0-11)
 * @param {Array} clocks - Clock entries (historique)
 * @param {Object} schedule - Planning de l'équipe
 * @returns {Array} Days of the month with status
 */
function getCalendarDays(year, month, clocks, schedule) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const today = new Date();
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
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const currentDate = new Date(year, month, day);
    const dayOfWeek = currentDate.getDay();
    const dayData = clocks.find(c => c.date === dateStr);
    const isFuture = currentDate > today;
    const isToday = currentDate.getTime() === today.getTime();
    
    let status = 'no-data';
    
    // Weekend
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      status = 'weekend';
    } else if (isFuture) {
      // Future: check planning
      const isWorkDay = schedule?.workDays?.includes(dayOfWeek);
      const isExcluded = schedule?.excludedDates?.includes(dateStr);
      
      if (isExcluded) {
        status = 'planned-off'; // Congé/jour férié prévu
      } else if (isWorkDay) {
        status = 'planned-work'; // Jour de travail prévu
      } else {
        status = 'no-data';
      }
    } else if (dayData) {
      // Past/Today: real data
      const totalMinutes = dayData.totalMinutes || 0;
      const expectedMinutes = 7.5 * 60; // 7h30
      
      if (totalMinutes >= expectedMinutes) {
        status = 'complete'; // Green
      } else if (totalMinutes > 0) {
        status = 'partial'; // Orange
      } else {
        status = 'absent'; // Red
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
 * Get status color and label
 */
function getStatusStyle(status) {
  switch (status) {
    case 'complete':
      return { bg: 'bg-green-100', border: 'border-green-400', text: 'text-green-800', dot: 'bg-green-500' };
    case 'partial':
      return { bg: 'bg-orange-100', border: 'border-orange-400', text: 'text-orange-800', dot: 'bg-orange-500' };
    case 'absent':
      return { bg: 'bg-red-100', border: 'border-red-400', text: 'text-red-800', dot: 'bg-red-500' };
    case 'weekend':
      return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-400', dot: 'bg-gray-300' };
    case 'planned-work':
      return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700', dot: 'bg-blue-400' };
    case 'planned-off':
      return { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700', dot: 'bg-purple-400' };
    default:
      return { bg: 'bg-white', border: 'border-gray-100', text: 'text-gray-300', dot: 'bg-gray-200' };
  }
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
 * ClockCalendarView Component
 * Visual calendar showing clock-in history with color-coded days
 */
export default function ClockCalendarView({ open, onClose, clocks = [], userName = 'Employé', schedule = null }) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  // Mock schedule if not provided
  const mockSchedule = {
    workDays: [1, 2, 3, 4, 5], // Lun-Ven
    startTime: '09:00',
    endTime: '17:30',
    excludedDates: [
      '2025-11-11', // Armistice
      '2025-12-25', // Noël
      '2025-12-26', // Lendemain Noël
    ]
  };

  const activeSchedule = schedule || mockSchedule;

  // Generate mock clock data for demonstration
  const mockClocks = useMemo(() => {
    const data = [];
    const now = new Date();
    
    // Generate 30 days of mock data
    for (let i = 0; i < 30; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      const dayOfWeek = date.getDay();
      if (dayOfWeek === 0 || dayOfWeek === 6) continue; // Skip weekends
      
      // Random variation
      const variance = Math.random();
      let totalMinutes;
      
      if (variance < 0.7) {
        totalMinutes = 450 + Math.floor(Math.random() * 60); // 7h30 - 8h30 (complete)
      } else if (variance < 0.9) {
        totalMinutes = 300 + Math.floor(Math.random() * 120); // 5h - 7h (partial)
      } else {
        totalMinutes = 0; // absent
      }
      
      data.push({
        date: dateStr,
        totalMinutes,
        clockIn: '09:00',
        clockOut: totalMinutes > 0 ? `${9 + Math.floor(totalMinutes / 60)}:${String((totalMinutes % 60) + Math.floor(Math.random() * 30)).padStart(2, '0')}` : null,
        breaks: totalMinutes > 0 ? 1 : 0
      });
    }
    
    return data;
  }, []);

  const calendarDays = useMemo(() => {
    return getCalendarDays(currentYear, currentMonth, clocks.length > 0 ? clocks : mockClocks, activeSchedule);
  }, [currentYear, currentMonth, clocks, mockClocks, activeSchedule]);

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
    const plannedWork = futureDays.filter(d => d.status === 'planned-work').length;
    const plannedOff = futureDays.filter(d => d.status === 'planned-off').length;
    
    return { 
      total: workDays.length, 
      past: pastDays.length,
      complete: completeDays, 
      partial: partialDays, 
      absent: absentDays,
      plannedWork,
      plannedOff
    };
  }, [calendarDays]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="w-4 h-4" />
            {userName}
          </DialogTitle>
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

                  const style = getStatusStyle(day.status);

                  return (
                    <div
                      key={idx}
                      onClick={() => handleDayClick(day)}
                      className={`
                        aspect-square rounded border-2 p-0.5 flex flex-col items-center justify-center
                        transition-all cursor-pointer text-[10px]
                        ${style.bg} ${style.border} ${style.text}
                        ${(day.data || day.isFuture) && day.status !== 'weekend' ? 'hover:shadow-md hover:scale-105' : ''}
                        ${day.isToday ? 'ring-2 ring-blue-500 ring-offset-1' : ''}
                      `}
                    >
                      <div className="font-semibold">{day.date}</div>
                      {((day.data && !day.isFuture) || (day.isFuture && (day.status === 'planned-work' || day.status === 'planned-off'))) && day.status !== 'weekend' && (
                        <div className={`w-1 h-1 rounded-full mt-0.5 ${style.dot}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="bg-gray-50 p-2 rounded-lg">
              <div className="grid grid-cols-3 gap-1.5 text-[10px]">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-green-100 border-2 border-green-400 flex-shrink-0" />
                  <span>Complète</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-orange-100 border-2 border-orange-400 flex-shrink-0" />
                  <span>Partielle</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-red-100 border-2 border-red-400 flex-shrink-0" />
                  <span>Absence</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-blue-50 border-2 border-blue-300 flex-shrink-0" />
                  <span>Prévu</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-purple-50 border-2 border-purple-300 flex-shrink-0" />
                  <span>Férié</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-gray-50 border-2 border-gray-200 flex-shrink-0" />
                  <span>Weekend</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Stats & Details */}
          <div className="space-y-2">
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
                  {(monthStats.plannedWork > 0 || monthStats.plannedOff > 0) && (
                    <div>
                      <div className="text-xs text-gray-500 mb-2">À venir</div>
                      <div className="space-y-2">
                        {monthStats.plannedWork > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs">Jours prévus</span>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 text-xs">
                              {monthStats.plannedWork}
                            </Badge>
                          </div>
                        )}
                        {monthStats.plannedOff > 0 && (
                          <div className="flex justify-between">
                            <span className="text-xs">Jours fériés</span>
                            <Badge variant="outline" className="bg-purple-50 text-purple-700 text-xs">
                              {monthStats.plannedOff}
                            </Badge>
                          </div>
                        )}
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
                      {selectedDay.status === 'planned-off' && (
                        <div className="text-xs text-purple-700 flex items-center gap-2">
                          <Badge variant="outline" className="bg-purple-100 text-purple-800">
                            Jour férié
                          </Badge>
                        </div>
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

            {/* Mock data notice */}
            <div className="text-xs text-center text-gray-500 p-2 bg-gray-50 rounded">
              💡 Données simulées
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

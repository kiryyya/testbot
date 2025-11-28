import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './CalendarView.css';

interface CalendarViewProps {
  communityId: number;
}

interface CalendarEvent {
  id: string;
  type: 'post' | 'broadcast' | 'post-broadcast';
  title: string;
  fullText?: string;
  scheduledAt: string;
  status: string;
  gameEnabled?: boolean;
  broadcastEnabled?: boolean;
  broadcastScheduledAt?: string;
  relatedPostId?: string;
}

type ViewMode = 'month' | 'week';

const CalendarView: React.FC<CalendarViewProps> = ({ communityId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'post' | 'broadcast' | 'post-broadcast'>('all');

  // Загрузить события календаря
  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCalendarEvents(communityId);
      if (response.success && response.data) {
        setEvents(response.data);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки событий календаря:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarEvents();
    
    // Обновляем каждые 30 секунд
    const interval = setInterval(loadCalendarEvents, 30000);
    return () => clearInterval(interval);
  }, [communityId]);

  // Навигация
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() - 7);
      setCurrentDate(newDate);
    }
  };

  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      const newDate = new Date(currentDate);
      newDate.setDate(newDate.getDate() + 7);
      setCurrentDate(newDate);
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  // Получить события для конкретной даты и часа
  const getEventsForDateTime = (date: Date, hour?: number): CalendarEvent[] => {
    const dateStr = date.toISOString().split('T')[0];
    return events.filter(event => {
      const eventDate = new Date(event.scheduledAt);
      const eventDateStr = eventDate.toISOString().split('T')[0];
      const matchesDate = eventDateStr === dateStr;
      const matchesType = filterType === 'all' || event.type === filterType;
      
      if (hour !== undefined) {
        const eventHour = eventDate.getHours();
        return matchesDate && matchesType && eventHour === hour;
      }
      
      return matchesDate && matchesType;
    });
  };

  // Получить события для недели
  const getWeekDays = (): Date[] => {
    const days: Date[] = [];
    const startOfWeek = new Date(currentDate);
    const day = startOfWeek.getDay();
    // Понедельник как первый день недели (0 = воскресенье, 1 = понедельник)
    const diff = startOfWeek.getDate() - (day === 0 ? 6 : day - 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      days.push(date);
    }
    
    return days;
  };

  // Генерация календаря для месяца
  const generateMonthCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    // Корректировка для понедельника как первого дня недели
    const adjustedStartingDay = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;
    
    const calendar: (Date | null)[] = [];
    
    // Пустые ячейки до первого дня месяца
    for (let i = 0; i < adjustedStartingDay; i++) {
      calendar.push(null);
    }
    
    // Дни месяца
    for (let day = 1; day <= daysInMonth; day++) {
      calendar.push(new Date(year, month, day));
    }
    
    return calendar;
  };

  const getEventTypeIcon = (type: string) => {
    switch (type) {
      case 'post':
        return '📝';
      case 'broadcast':
        return '📢';
      case 'post-broadcast':
        return '📝📢';
      default:
        return '📅';
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'post':
        return '#2196F3';
      case 'broadcast':
        return '#FF9800';
      case 'post-broadcast':
        return '#9C27B0';
      default:
        return '#666';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return '#9C27B0';
      case 'published':
      case 'completed':
        return '#4CAF50';
      case 'running':
        return '#2196F3';
      case 'failed':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const monthNames = [
    'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
    'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
  ];

  const dayNames = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
  const dayNamesFull = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

  const today = new Date();
  const isToday = (date: Date | null) => {
    if (!date) return false;
    return date.toDateString() === today.toDateString();
  };

  // Рендер месячного вида
  const renderMonthView = () => {
    const calendar = generateMonthCalendar();
    
    return (
      <div className="calendar-month-view">
        <div className="calendar-grid">
          {/* Заголовки дней недели */}
          {dayNames.map(day => (
            <div key={day} className="calendar-day-header">{day}</div>
          ))}

          {/* Дни месяца */}
          {calendar.map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="calendar-day empty"></div>;
            }

            const dateStr = date.toISOString().split('T')[0];
            const dayEvents = getEventsForDateTime(date);
            const isCurrentDay = isToday(date);
            const isSelected = selectedDate && date.toDateString() === selectedDate.toDateString();

            return (
              <div
                key={dateStr}
                className={`calendar-day ${isCurrentDay ? 'today' : ''} ${isSelected ? 'selected' : ''} ${dayEvents.length > 0 ? 'has-events' : ''}`}
                onClick={() => setSelectedDate(date)}
              >
                <div className="calendar-day-number">{date.getDate()}</div>
                {dayEvents.length > 0 && (
                  <div className="calendar-day-events">
                    {dayEvents.slice(0, 3).map((event, idx) => (
                      <div
                        key={event.id}
                        className="calendar-event-dot"
                        style={{ backgroundColor: getEventTypeColor(event.type) }}
                        title={`${getEventTypeIcon(event.type)} ${event.title}`}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <div className="calendar-event-more">+{dayEvents.length - 3}</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Рендер недельного вида с почасовой разбивкой
  const renderWeekView = (weekDays: Date[]) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="calendar-week-view">
        <div className="week-header">
          <div className="week-hour-header"></div>
          {weekDays.map((day, idx) => {
            const dayIndex = day.getDay() === 0 ? 6 : day.getDay() - 1;
            return (
              <div key={idx} className={`week-day-header ${isToday(day) ? 'today' : ''}`}>
                <div className="week-day-name">{dayNamesFull[dayIndex]}</div>
                <div className="week-day-date">{day.getDate()} {monthNames[day.getMonth()].substring(0, 3)}</div>
              </div>
            );
          })}
        </div>

        <div className="week-hours-container">
          {hours.map(hour => (
            <div key={hour} className="week-hour-row">
              <div className="week-hour-label">{hour.toString().padStart(2, '0')}:00</div>
              {weekDays.map((day, dayIdx) => {
                const hourEvents = getEventsForDateTime(day, hour);
                return (
                  <div
                    key={`${dayIdx}-${hour}`}
                    className={`week-hour-cell ${hourEvents.length > 0 ? 'has-events' : ''} ${isToday(day) ? 'today' : ''}`}
                  >
                    {hourEvents.map(event => (
                      <div
                        key={event.id}
                        className="week-event-item"
                        style={{ backgroundColor: getEventTypeColor(event.type) }}
                        title={`${getEventTypeIcon(event.type)} ${event.title}\n${new Date(event.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
                      >
                        <div className="week-event-icon">{getEventTypeIcon(event.type)}</div>
                        <div className="week-event-title">{event.title}</div>
                        <div className="week-event-time">
                          {new Date(event.scheduledAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const selectedDateEvents = selectedDate ? getEventsForDateTime(selectedDate) : [];
  
  // Вычисляем дни недели для использования в заголовке и рендере
  const weekDays = viewMode === 'week' ? getWeekDays() : [];

  return (
    <div className="calendar-view">
      <div className="calendar-header">
        <h3 className="calendar-title">📅 Календарь событий</h3>
        <div className="calendar-controls">
          <div className="view-mode-switcher">
            <button
              className={`view-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Месяц
            </button>
            <button
              className={`view-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Неделя
            </button>
          </div>
          <button onClick={goToPrevious} className="calendar-nav-btn">‹</button>
          <button onClick={goToToday} className="calendar-today-btn">Сегодня</button>
          <button onClick={goToNext} className="calendar-nav-btn">›</button>
        </div>
      </div>

      <div className="calendar-filters">
        <button
          className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
          onClick={() => setFilterType('all')}
        >
          Все
        </button>
        <button
          className={`filter-btn ${filterType === 'post' ? 'active' : ''}`}
          onClick={() => setFilterType('post')}
        >
          📝 Посты
        </button>
        <button
          className={`filter-btn ${filterType === 'broadcast' ? 'active' : ''}`}
          onClick={() => setFilterType('broadcast')}
        >
          📢 Рассылки
        </button>
        <button
          className={`filter-btn ${filterType === 'post-broadcast' ? 'active' : ''}`}
          onClick={() => setFilterType('post-broadcast')}
        >
          📝📢 Посты+Рассылки
        </button>
        <button
          onClick={loadCalendarEvents}
          className="refresh-calendar-btn"
          disabled={loading}
        >
          {loading ? '🔄' : '↻'} Обновить
        </button>
      </div>

      <div className="calendar-month-header">
        {viewMode === 'month' ? (
          <h4>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h4>
        ) : weekDays.length > 0 ? (
          <h4>
            {weekDays[0].getDate()} {monthNames[weekDays[0].getMonth()]} - {weekDays[6].getDate()} {monthNames[weekDays[6].getMonth()]} {currentDate.getFullYear()}
          </h4>
        ) : null}
      </div>

      {viewMode === 'month' ? renderMonthView() : renderWeekView(weekDays)}

      {/* Список событий выбранной даты (только для месячного вида) */}
      {viewMode === 'month' && selectedDate && (
        <div className="calendar-events-list">
          <h4 className="events-list-title">
            События на {selectedDate.toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric'
            })}
          </h4>
          {selectedDateEvents.length === 0 ? (
            <div className="events-list-empty">Нет событий на эту дату</div>
          ) : (
            <div className="events-list-items">
              {selectedDateEvents.map(event => (
                <div
                  key={event.id}
                  className="calendar-event-item"
                  style={{ borderLeftColor: getEventTypeColor(event.type) }}
                >
                  <div className="event-item-header">
                    <span className="event-type-icon">{getEventTypeIcon(event.type)}</span>
                    <span className="event-time">
                      {new Date(event.scheduledAt).toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span
                      className="event-status"
                      style={{ color: getStatusColor(event.status) }}
                    >
                      {event.status === 'scheduled' ? 'Запланировано' :
                       event.status === 'published' ? 'Опубликовано' :
                       event.status === 'completed' ? 'Завершено' :
                       event.status === 'running' ? 'В процессе' :
                       event.status === 'failed' ? 'Ошибка' : event.status}
                    </span>
                  </div>
                  <div className="event-item-title">{event.title}</div>
                  {event.gameEnabled && (
                    <div className="event-item-badge game-badge">🎮 Игра включена</div>
                  )}
                  {event.type === 'post-broadcast' && event.relatedPostId && (
                    <div className="event-item-badge related-badge">Связано с постом</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Легенда */}
      <div className="calendar-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
          <span>Посты</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
          <span>Рассылки</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#9C27B0' }}></div>
          <span>Посты+Рассылки</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;


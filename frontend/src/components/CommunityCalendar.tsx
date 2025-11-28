import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import './CommunityCalendar.css';

interface CommunityCalendarProps {
  communityId: number;
}

interface CalendarEvent {
  id: string;
  type: 'post' | 'broadcast';
  title: string;
  description: string;
  scheduledAt: string;
  status: string;
  gameEnabled?: boolean;
  totalRecipients?: number;
  sentCount?: number;
}

const CommunityCalendar: React.FC<CommunityCalendarProps> = ({ communityId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedEvents, setSelectedEvents] = useState<CalendarEvent[]>([]);

  // Загрузить события календаря
  const loadCalendarEvents = async () => {
    try {
      setLoading(true);
      const response = await apiService.getCommunityCalendar(communityId);
      if (response.success && response.data) {
        setEvents(response.data);
      }
    } catch (error: any) {
      console.error('Ошибка загрузки календаря:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCalendarEvents();
  }, [communityId]);

  // Получить события для конкретной даты
  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDate = new Date(event.scheduledAt);
      return (
        eventDate.getDate() === date.getDate() &&
        eventDate.getMonth() === date.getMonth() &&
        eventDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Получить цвет для типа события
  const getEventColor = (type: string): string => {
    switch (type) {
      case 'post':
        return '#2196F3'; // Синий
      case 'broadcast':
        return '#FF9800'; // Оранжевый
      default:
        return '#666';
    }
  };

  // Получить иконку для типа события
  const getEventIcon = (type: string): string => {
    switch (type) {
      case 'post':
        return '📝';
      case 'broadcast':
        return '📢';
      default:
        return '📅';
    }
  };

  // Получить название месяца
  const getMonthName = (date: Date): string => {
    const months = [
      'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
      'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
    ];
    return months[date.getMonth()];
  };

  // Получить дни месяца
  const getDaysInMonth = (date: Date): Date[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];

    // Добавляем дни предыдущего месяца для заполнения недели
    const startDay = firstDay.getDay();
    const prevMonth = new Date(year, month, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      days.push(new Date(year, month - 1, prevMonth.getDate() - i));
    }

    // Добавляем дни текущего месяца
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    // Добавляем дни следующего месяца для заполнения недели
    const remainingDays = 42 - days.length; // 6 недель * 7 дней
    for (let day = 1; day <= remainingDays; day++) {
      days.push(new Date(year, month + 1, day));
    }

    return days;
  };

  // Переход к предыдущему месяцу
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  // Переход к следующему месяцу
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  // Переход к текущему месяцу
  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDate(today);
    setSelectedEvents(getEventsForDate(today));
  };

  // Обработка клика по дню
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    setSelectedEvents(getEventsForDate(date));
  };

  // Проверка, является ли дата сегодняшней
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  // Проверка, является ли дата выбранной
  const isSelected = (date: Date): boolean => {
    if (!selectedDate) return false;
    return (
      date.getDate() === selectedDate.getDate() &&
      date.getMonth() === selectedDate.getMonth() &&
      date.getFullYear() === selectedDate.getFullYear()
    );
  };

  // Проверка, является ли дата текущего месяца
  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <div className="community-calendar">
      <div className="calendar-header">
        <h3 className="calendar-title">📅 Календарь запланированных событий</h3>
        <button
          onClick={loadCalendarEvents}
          className="calendar-refresh-btn"
          disabled={loading}
        >
          {loading ? '🔄' : '↻'} Обновить
        </button>
      </div>

      <div className="calendar-container">
        {/* Навигация по месяцам */}
        <div className="calendar-navigation">
          <button onClick={goToPreviousMonth} className="calendar-nav-btn">
            ←
          </button>
          <div className="calendar-month-year">
            {getMonthName(currentDate)} {currentDate.getFullYear()}
          </div>
          <button onClick={goToNextMonth} className="calendar-nav-btn">
            →
          </button>
          <button onClick={goToToday} className="calendar-today-btn">
            Сегодня
          </button>
        </div>

        {/* Календарь */}
        <div className="calendar-grid">
          {/* Дни недели */}
          <div className="calendar-weekdays">
            {weekDays.map((day, index) => (
              <div key={index} className="calendar-weekday">
                {day}
              </div>
            ))}
          </div>

          {/* Дни месяца */}
          <div className="calendar-days">
            {days.map((day, index) => {
              const dayEvents = getEventsForDate(day);
              const isTodayDate = isToday(day);
              const isSelectedDate = isSelected(day);
              const isCurrentMonthDate = isCurrentMonth(day);

              return (
                <div
                  key={index}
                  className={`calendar-day ${isTodayDate ? 'today' : ''} ${isSelectedDate ? 'selected' : ''} ${!isCurrentMonthDate ? 'other-month' : ''}`}
                  onClick={() => handleDateClick(day)}
                >
                  <div className="calendar-day-number">{day.getDate()}</div>
                  {dayEvents.length > 0 && (
                    <div className="calendar-day-events">
                      {dayEvents.slice(0, 3).map((event, eventIndex) => (
                        <div
                          key={eventIndex}
                          className="calendar-day-event-dot"
                          style={{ backgroundColor: getEventColor(event.type) }}
                          title={event.title}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="calendar-day-event-more">
                          +{dayEvents.length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Легенда */}
        <div className="calendar-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#2196F3' }}></div>
            <span>📝 Пост</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#FF9800' }}></div>
            <span>📢 Рассылка</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#9C27B0' }}></div>
            <span>📝📢 Пост + Рассылка</span>
          </div>
        </div>

        {/* События выбранной даты */}
        {selectedDate && (
          <div className="calendar-events-panel">
            <h4 className="events-panel-title">
              События на {selectedDate.toLocaleDateString('ru-RU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </h4>
            {selectedEvents.length === 0 ? (
              <div className="events-panel-empty">
                На эту дату нет запланированных событий
              </div>
            ) : (
              <div className="events-panel-list">
                {selectedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="calendar-event-card"
                    style={{ borderLeftColor: getEventColor(event.type) }}
                  >
                    <div className="event-card-header">
                      <div className="event-card-icon">{getEventIcon(event.type)}</div>
                      <div className="event-card-title">{event.title}</div>
                      <div className="event-card-time">
                        {new Date(event.scheduledAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="event-card-description">{event.description}</div>
                    {event.gameEnabled && (
                      <div className="event-card-extra">🎮 Игра включена</div>
                    )}
                    {event.totalRecipients !== undefined && (
                      <div className="event-card-extra">
                        Получателей: {event.sentCount || 0} / {event.totalRecipients}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommunityCalendar;


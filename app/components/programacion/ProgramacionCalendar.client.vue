<script setup lang="ts">
import FullCalendar from '@fullcalendar/vue3'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'

const props = defineProps<{
  events: Array<Record<string, any>>
}>()

const emit = defineEmits<{
  eventClick: [event: any]
}>()

const calendarOptions = computed(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  locale: esLocale,
  initialView: 'listWeek',
  headerToolbar: {
    left: 'prev,next today',
    center: 'title',
    right: 'timeGridDay,timeGridWeek,listWeek',
  },
  buttonText: {
    today: 'Hoy',
    day: 'Día',
    week: 'Semana',
    list: 'Lista',
  },
  height: 760,
  expandRows: true,
  slotMinTime: '06:00:00',
  slotMaxTime: '21:00:00',
  slotDuration: '00:15:00',
  slotLabelInterval: '00:30:00',
  allDaySlot: false,
  nowIndicator: true,
  editable: false,
  selectable: false,
  eventOverlap: false,
  slotEventOverlap: false,
  eventMinHeight: 74,
  eventShortHeight: 74,
  displayEventEnd: true,
  dayMaxEventRows: 3,
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  views: {
    timeGridDay: {
      dayHeaderFormat: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
    },
    timeGridWeek: {
      dayHeaderFormat: { weekday: 'short', day: 'numeric', month: 'short' },
    },
    listWeek: {
      dayHeaderFormat: { weekday: 'long', day: 'numeric', month: 'long' },
    },
  },
  events: props.events,
  eventClick: (info: any) => emit('eventClick', info.event),
}))
</script>

<template>
  <FullCalendar :options="calendarOptions">
    <template #eventContent="arg">
      <div class="fc-cx-event">
        <p class="fc-cx-name">{{ arg.event.title }}</p>
        <p class="fc-cx-id">{{ arg.event.extendedProps.identificacion }}</p>
        <p v-if="arg.event.extendedProps.medico" class="fc-cx-doctor">Dr(a). {{ arg.event.extendedProps.medico }}</p>
        <div class="fc-cx-footer">
          <span class="fc-cx-time">{{ arg.timeText }}</span>
          <span v-if="arg.event.extendedProps.estadoLabel" class="fc-cx-estado">{{ arg.event.extendedProps.estadoLabel }}</span>
        </div>
      </div>
    </template>
  </FullCalendar>
</template>

<style scoped>
:deep(.fc) {
  --fc-border-color: #e2e8f0;
  --fc-page-bg-color: #ffffff;
  --fc-neutral-bg-color: #f8fafc;
  --fc-list-event-hover-bg-color: #ecfeff;
  --fc-today-bg-color: #f0fdfa;
  font-size: 0.92rem;
}

:deep(.fc .fc-toolbar-title) {
  color: #0f172a;
  font-size: 1.25rem;
  font-weight: 700;
}

:deep(.fc .fc-button) {
  background: #0f766e;
  border-color: #0f766e;
  text-transform: none;
  box-shadow: none;
}

:deep(.fc .fc-button:hover) {
  background: #0b5f58;
  border-color: #0b5f58;
}

:deep(.fc .fc-button.fc-button-active) {
  background: #115e59;
  border-color: #115e59;
}

:deep(.fc .fc-timegrid-event) {
  border-radius: 10px;
  border-width: 1px;
  box-shadow: 0 2px 6px rgba(2, 6, 23, 0.18);
  padding: 4px 0;
}

:deep(.fc .fc-timegrid-event .fc-event-main) {
  padding: 6px 8px;
}

:deep(.fc .fc-list-event:hover td) {
  background: #f0fdfa;
}

:deep(.fc .fc-list-event-title a),
:deep(.fc .fc-list-event-time) {
  color: #0f172a;
  font-weight: 600;
}

.fc-cx-event {
  line-height: 1.15;
}

.fc-cx-name {
  font-size: 0.8rem;
  font-weight: 700;
  margin: 0;
  white-space: normal;
}

.fc-cx-id {
  font-size: 0.7rem;
  opacity: 0.95;
  margin: 2px 0 0;
}

.fc-cx-doctor {
  font-size: 0.68rem;
  margin: 3px 0 0;
  opacity: 0.94;
}

.fc-cx-time {
  font-size: 0.68rem;
  margin: 4px 0 0;
  opacity: 0.9;
}

.fc-cx-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-top: 4px;
}

.fc-cx-estado {
  font-size: 0.6rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  background: rgba(255,255,255,0.22);
  border-radius: 999px;
  padding: 1px 6px;
  white-space: nowrap;
}
</style>
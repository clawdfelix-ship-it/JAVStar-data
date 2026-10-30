import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EventCard from '../components/EventCard';
import { EventDetailModal, generateICS } from '../components/EventCalendar';
import {
  formatEventDateLabel,
  formatEventTime,
  formatEventWeekday,
  getEventTimeZoneLabel,
  getEventDateKey,
  getEventDateSource,
  getICSEventDates,
  getICSDateLines,
  parseEventDate,
} from '../lib/eventDate';

// Captured from live /api/events on 2026-10-31. The source row is date-only:
// { id: 'tw-oct-31a', datetime: '2026-10-31', date_iso: '2026-10-31', prefecture: '台北' }
const liveDateOnlyEvent = {
  id: 'tw-oct-31a',
  title: '台灣活動',
  venue: '',
  prefecture: '台北',
  datetime: '2026-10-31',
  date_iso: '2026-10-31',
  event_type: 'photo',
  url: '',
  actress_name: '栗山莉緒',
};

test('live 2026-10-31 payload is Saturday with identical group/card weekday in any host timezone', () => {
  assert.equal(formatEventWeekday(liveDateOnlyEvent.datetime), '土');
  assert.match(formatEventDateLabel(liveDateOnlyEvent.datetime, { month: 'long', day: 'numeric', weekday: 'long' }), /土曜日/);
  assert.equal(formatEventDateLabel('2026-11-01', { weekday: 'long' }), '日曜日');
});

test('date-only parsing never crosses a UTC day boundary', () => {
  const date = parseEventDate('2026-10-31');
  assert.equal(date.toISOString().slice(0, 10), '2026-10-31');
  assert.equal(formatEventWeekday('2026-10-31T00:00:00+09:00'), '土');
});

test('date-only events show unknown time, not 00:00, 08:00 or 09:00', () => {
  for (const date of ['2026-10-31', '2026-10-31']) {
    assert.equal(formatEventTime(date), '時間待公布');
    assert.equal(getEventTimeZoneLabel(date), null);
  }
  const card = renderToStaticMarkup(React.createElement(EventCard, liveDateOnlyEvent));
  assert.match(card, /時間待公布/);
  assert.doesNotMatch(card, /00:00|08:00|09:00/);
});

test('calendar detail also shows unknown time for the original live payload', () => {
  const html = renderToStaticMarkup(React.createElement(EventDetailModal, { event: liveDateOnlyEvent, onClose: () => {} }));
  assert.match(html, /時間待公布/);
  assert.doesNotMatch(html, /00:00|08:00|09:00/);
});

test('date-only ICS is all-day, without a fabricated two-hour timed session', () => {
  assert.deepEqual(getICSEventDates(liveDateOnlyEvent.datetime), {
    allDay: true,
    start: '20261031',
    end: '20261101',
  });
});

test('explicit source time keeps its source wall clock and timezone instead of silently converting', () => {
  assert.equal(formatEventTime('2026-10-31T18:30:00+09:00'), '18:30');
  assert.equal(getEventTimeZoneLabel('2026-10-31T18:30:00+09:00'), 'UTC+09:00');
  assert.equal(formatEventTime('2026-10-31T18:30:00Z'), '18:30');
  assert.equal(getEventTimeZoneLabel('2026-10-31T18:30:00Z'), 'UTC');
  assert.equal(getEventTimeZoneLabel('2026-10-31 18:30:00'), '來源時間');
  assert.equal(formatEventWeekday('2026-11-01T00:00:00+09:00'), '日');
  assert.equal(getEventDateKey('2026-11-01T00:00:00+09:00'), '2026-11-01');
});

test('malformed/fullwidth raw dates retain the existing date_iso fallback everywhere', () => {
  for (const raw of ['２０２６-0８-２２', '2026-26-08']) {
    const event = { ...liveDateOnlyEvent, datetime: raw, date_iso: '2026-10-31' };
    assert.equal(getEventDateSource(event), '2026-10-31');
    assert.equal(getEventDateKey(getEventDateSource(event)), '2026-10-31');
    assert.equal(formatEventWeekday(getEventDateSource(event)), '土');
    assert.equal(formatEventTime(getEventDateSource(event)), '時間待公布');
    const card = renderToStaticMarkup(React.createElement(EventCard, event));
    assert.match(card, /10\/31\(土\)/);
    assert.doesNotMatch(card, /日期待確認|00:00|08:00/);
    assert.match(generateICS(event), /DTSTART;VALUE=DATE:20261031/);
  }
  assert.equal(getEventDateSource({ datetime: '2026-26-08', date_iso: 'bad' }), '');
  assert.throws(() => getICSDateLines(''), /valid source date/);
});

test('generated ICS contains real all-day VEVENT dates, not a fabricated session', () => {
  const ics = generateICS(liveDateOnlyEvent);
  assert.match(ics, /DTSTART;VALUE=DATE:20261031/);
  assert.match(ics, /DTEND;VALUE=DATE:20261101/);
  assert.doesNotMatch(ics, /DTSTART:20261031T|DTEND:20261031T/);
});

test('generated timed ICS keeps offset instants and timezone-less source times', () => {
  const floating = generateICS({ ...liveDateOnlyEvent, datetime: '2026-10-31 18:30:00' });
  assert.match(floating, /DTSTART:20261031T183000/);
  assert.match(floating, /DTEND:20261031T203000/);
  assert.doesNotMatch(floating, /DTSTART:20261031T183000Z/);
  const tokyo = generateICS({ ...liveDateOnlyEvent, datetime: '2026-10-31T18:30:00+09:00' });
  assert.match(tokyo, /DTSTART:20261031T093000Z/);
  assert.match(tokyo, /DTEND:20261031T113000Z/);
});

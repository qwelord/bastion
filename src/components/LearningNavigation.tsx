import { useEffect, useState } from 'react';
import { lessons, findLesson } from '../learning/catalog';
import { courses, courseForLesson, courseLink, courseLessons } from '../learning/courses';
import { lessonLink, readLearning, lessonStats } from '../learning/progress';
import { learningAreas, learningLocation, areaLink } from '../learning/navigation';

export function LearningNavigation({ hash }: { hash: string }) {
  const [progress, setProgress] = useState(() => readLearning(lessons));
  useEffect(() => {
    const refresh = () => setProgress(readLearning(lessons));
    window.addEventListener('bastion:learning', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('bastion:learning', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('focus', refresh);
    };
  }, []);
  const { path, area, filter } = learningLocation(hash);
  const lessonId = path.startsWith('#lesson/') ? path.slice(8) : '';
  const course = path.startsWith('#learn/course/')
    ? courses.find((c) => c.id === path.slice(14))
    : courseForLesson(lessonId);
  const review = lessons.filter((l) => lessonStats(l, progress.entries[l.id]).review > 0).length;
  const links = [
    { href: '#learn', label: 'Все курсы', current: path === '#learn' && !area },
    {
      href: '#learn/lessons',
      label: 'Все уроки',
      current: path === '#learn/lessons' && filter === 'Все' && !area,
    },
    {
      href: '#learn/lessons?filter=review',
      label: 'Повторить трудное',
      current: filter === 'Повторить',
      count: review,
    },
    { href: '#learn/lessons?filter=favorite', label: 'Избранное', current: filter === 'Избранное' },
  ];
  return (
    <>
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="context-link"
          aria-current={link.current ? 'page' : undefined}
        >
          <span>{link.label}</span>
          {!!link.count && <small>{link.count}</small>}
        </a>
      ))}
      {course ? (
        <div className="context-course">
          <a className="context-heading" href={courseLink(course.id)}>
            {course.title}
          </a>
          <div className="context-program" aria-label="Быстрый переход к уроку">
            {courseLessons(course).map((lesson, index) => (
              <a
                className="context-link"
                key={lesson.id}
                href={lessonLink(lesson.id)}
                aria-current={lesson.id === lessonId ? 'page' : undefined}
              >
                <small>
                  {lessonStats(lesson, progress.entries[lesson.id]).finished ? '✓' : index + 1}
                </small>
                <span>{lesson.title}</span>
              </a>
            ))}
          </div>
        </div>
      ) : (
        <div className="context-directions">
          <span className="context-heading">Направления</span>
          {learningAreas.map((item) => (
            <a
              className="context-link"
              key={item.id}
              href={areaLink(item.id)}
              aria-current={area === item.id ? 'page' : undefined}
            >
              {item.title}
            </a>
          ))}
          {findLesson(progress.lastLesson) && (
            <a className="context-resume" href={lessonLink(progress.lastLesson)}>
              Продолжить урок<span>{findLesson(progress.lastLesson)!.title}</span>
            </a>
          )}
        </div>
      )}
    </>
  );
}

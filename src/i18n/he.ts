/** Hebrew is the source dictionary: its keys define the type for every other language. */
export const he = {
  'app.name': 'Badge DNA',
  'nav.home': 'בית',
  'nav.back': 'חזרה',
  'common.cancel': 'ביטול',
  'common.close': 'סגירה',

  'lang.label': 'שפה',
  'lang.he': 'עברית',
  'lang.en': 'English',

  'dev.banner': 'גרסת פיתוח · חידות בדיקה בלבד (קבוצות וסמלים מומצאים)',
  'dev.testPuzzle': 'חידת בדיקה',

  'home.tagline': 'מזהים את הקבוצה לפי החלקים של הסמל',
  'home.practice': 'אימון חופשי',
  'home.daily.title': 'אתגר יומי',
  'home.daily.unavailable': 'האתגר היומי עדיין לא זמין',
  'home.howTo': 'איך משחקים',
  'home.settings': 'הגדרות',

  'content.empty.title': 'אין חידות זמינות עדיין',
  'content.empty.body': 'המנוע מוכן, אבל עדיין לא פורסמו חידות מאושרות של קבוצות אמיתיות.',
  'content.error.title': 'לא הצלחנו לטעון את התוכן',

  'practice.title': 'אימון חופשי',
  'practice.puzzleOf': 'חידה {n} מתוך {total}',
  'practice.exhausted.title': 'סיימת את כל החידות',
  'practice.exhausted.body': 'עברת על כל החידות הזמינות בסבב הזה.',
  'practice.newCycle': 'סבב חדש',
  'practice.finish': 'לסיום הסבב',
  'practice.summary': 'ניסיונות: {attempts} · הצלחות: {solved}',
  'practice.restore.title': 'לא ניתן לשחזר את ההתקדמות',
  'practice.restore.body':
    'ההתקדמות השמורה מתייחסת לחידה שכבר לא זמינה בגרסה הזאת. הרשומה המקורית תישמר בצד.',
  'practice.restore.startNew': 'התחלת סשן חדש',

  'storage.unavailable': 'האחסון המקומי לא זמין. אפשר לשחק, אבל ההתקדמות לא תישמר.',
  'storage.saveFailed': 'השמירה נכשלה. ההתקדמות עלולה ללכת לאיבוד.',

  'round.possible': 'ניקוד אפשרי: {score}',
  'round.mistakes': 'טעויות: {n} מתוך {max}',
  'round.cluesTitle': 'הרמזים',
  'round.loadFailed.title': 'לא הצלחנו לטעון את החידה',
  'round.loadFailed.body': 'זו תקלה טכנית ולא נספרה כניסיון. אפשר לנסות שוב.',
  'round.retry': 'נסו שוב',

  'clue.label': 'רמז {n}',
  'clue.alt': 'אלמנט מספר {n} מתוך הסמל',
  'clue.loading': 'טוען…',
  'clue.zoom': 'הגדלה',
  'clue.zoomTitle': 'רמז {n}',

  'guess.label': 'איזו קבוצה זו?',
  'guess.placeholder': 'הקלידו שם קבוצה',
  'guess.button': 'ניחוש',
  'guess.suggestions': 'הצעות לקבוצות',
  'guess.noResults': 'לא נמצאו קבוצות',
  'guess.pickHint': 'בחרו קבוצה מהרשימה כדי לנחש.',
  'guess.duplicate': 'כבר ניחשת את הקבוצה הזאת. זה לא נספר כטעות.',
  'guess.wrong.one': 'לא נכון. נותר ניסיון אחד.',
  'guess.wrong.other': 'לא נכון. נותרו {n} ניסיונות.',
  'guess.history': 'ניחושים קודמים',
  'guess.wrongMark': 'שגוי',

  'reveal.button': 'חשיפה נוספת · ניקוד אחרי חשיפה: {score}',
  'reveal.loading': 'טוען רמז…',
  'reveal.allShown': 'כל הרמזים נחשפו',
  'reveal.announce': 'נחשף רמז {n}',
  'reveal.failed': 'טעינת הרמז נכשלה. לא ירד ניקוד. אפשר לנסות שוב.',

  'giveUp.button': 'ויתור',
  'giveUp.confirm': 'לחשוף את התשובה ולסיים את הסיבוב?',
  'giveUp.yes': 'חשיפה וסיום',

  'result.solved': 'נכון!',
  'result.failed': 'הסיבוב הסתיים',
  'result.gave_up': 'ויתרת על החידה',
  'result.answer': 'הקבוצה: {name}',
  'result.score': 'ניקוד: {score}',
  'result.revealed': 'אלמנטים שנחשפו: {k} מתוך {n}',
  'result.mistakes': 'טעויות: {n}',
  'result.crestAlt': 'הסמל המלא של {name}',
  'result.crestFailed': 'טעינת הסמל המלא נכשלה. הניקוד נשמר.',
  'result.crestTitle': 'הסמל המלא',
  'result.next': 'לחידה הבאה',

  'howTo.title': 'איך משחקים',
  'howTo.1': 'בכל חידה מוצג רכיב אחד מתוך סמל של קבוצת כדורגל. כל רכיב מופיע בכרטיס נפרד.',
  'howTo.2': 'אפשר לנחש, או לבקש חשיפה של רכיב נוסף. הרכיבים שכבר נחשפו נשארים גלויים.',
  'howTo.3': 'כל חשיפה מורידה מהניקוד האפשרי. גם כל טעות מורידה ניקוד, ושלוש טעויות מסיימות את הסיבוב.',
  'howTo.4': 'בסוף הסיבוב מוצג הסמל המלא. אין הגבלת זמן.',

  'settings.title': 'הגדרות',
  'settings.reset': 'איפוס נתונים מקומיים',
  'settings.resetHelp': 'מוחק את ההתקדמות וההגדרות השמורות בדפדפן הזה. הפעולה אינה הפיכה.',
  'settings.resetConfirm': 'למחוק את כל ההתקדמות השמורה במכשיר הזה?',
  'settings.resetYes': 'מחיקה',
  'settings.resetDone': 'הנתונים המקומיים נמחקו.',
  'settings.exportEvents': 'ייצוא יומן אירועים (פיתוח)',
} as const

export type MessageKey = keyof typeof he

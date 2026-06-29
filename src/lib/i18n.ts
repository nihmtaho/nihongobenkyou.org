export type Lang = 'vi' | 'en'

const translations: Record<Lang, Record<string, string>> = {
  vi: {
    // Streak
    'streak.label': 'STREAK',
    'streak.unit': 'NGÀY',

    // Daily goal
    'goal.label': 'MỤC TIÊU',
    'goal.unit': 'LẦN',
    'goal.complete': '🎉 Hoàn thành hôm nay!',

    // Review activity widget
    'review.title': 'CHI TIẾT ÔN TẬP',
    'review.total': 'TỔNG',
    'review.thisMonth': 'THÁNG NÀY',
    'review.last7Days': '7 NGÀY GẦN NHẤT',
    'review.ratingDist': 'PHÂN BỔ ĐÁNH GIÁ',
    'review.next': 'ôn tiếp:',

    // Stat chip labels
    'stat.today': 'HÔM NAY',
    'stat.thisWeek': 'TUẦN NÀY',
    'stat.avgPerDay': 'TB/NGÀY',
    'stat.learned': 'ĐÃ HỌC',

    // Units
    'unit.days': 'ngày',
    'unit.times': 'lượt',
    'unit.cards': 'thẻ',
    'unit.vocab': 'từ vựng',
    'unit.kanji': 'hán tự',

    // SRS state labels (stat counters)
    'srs.new': 'CHƯA HỌC',
    'srs.learning': 'ĐANG HỌC',
    'srs.review': 'ÔN TẬP',
    'srs.mature': 'ĐÃ THUỘC',

    // SRS state labels (legend)
    'srs.new.legend': 'Chưa học',
    'srs.learning.legend': 'Đang học',
    'srs.review.legend': 'Ôn tập',
    'srs.mature.legend': 'Đã thuộc',

    // Learning analytics widget
    'analytics.title': 'TIẾN ĐỘ HỌC',
    'subject.vocab': 'TỪ VỰNG',
    'subject.kanji': 'HÁN TỰ',

    // Settings — dark mode
    'settings.darkMode.title': 'GIAO DIỆN TỐI',
    'settings.on': 'Bật',
    'settings.off': 'Tắt',

    // Settings — sync
    'settings.sync.title': 'ĐỒNG BỘ ĐÁM MÂY',
    'settings.sync.enable': 'Bật đồng bộ',
    'settings.sync.syncing': 'Đang đồng bộ...',
    'settings.sync.done': '✓ Đã đồng bộ',
    'settings.sync.syncNow': 'Đồng bộ ngay',
    'settings.sync.pending': 'chờ',
    'settings.sync.locked': 'KHÓA',
    'settings.sync.loginRequired': 'Chỉ dành cho tài khoản đã đăng nhập',
    'settings.sync.loginToSync': 'Đăng nhập để đồng bộ',

    // Settings — account
    'settings.account.title': 'TÀI KHOẢN',
    'settings.account.logout': 'Đăng xuất',
    'settings.account.delete': 'Xóa tài khoản',
    'settings.account.deleteConfirmTitle': 'XÁC NHẬN XÓA TÀI KHOẢN',
    'settings.account.deletePermanent': 'Xóa vĩnh viễn',

    // Common
    'common.cancel': 'Hủy',
    'common.or': 'HOẶC',

    // Home page
    'home.tagline': 'NHẬT NGỮ · HỌC MỖI NGÀY',
    'home.settings': 'Cài đặt',
    'home.startStudy': 'BẮT ĐẦU HỌC',
    'home.details': 'CHI TIẾT',
    'home.todayProgress': 'TIẾN ĐỘ HÔM NAY',
    'home.reviewVocab': 'Ôn tập từ vựng',
    'home.reviewKanji': 'Ôn tập hán tự',
    'home.exploreLessons': 'Khám phá bài học',

    // Auth
    'auth.login.title': 'ĐĂNG NHẬP',
    'auth.login.submit': 'Đăng nhập',
    'auth.forgotPassword': 'Quên mật khẩu?',
    'auth.noAccount': 'Chưa có tài khoản?',
    'auth.register': 'Đăng ký',

    // SW update banner
    'update.newVersion': 'Có phiên bản mới!',
    'update.reload': 'Tải lại',
  },

  en: {
    // Streak
    'streak.label': 'STREAK',
    'streak.unit': 'DAYS',

    // Daily goal
    'goal.label': 'GOAL',
    'goal.unit': 'TIMES',
    'goal.complete': '🎉 Goal complete today!',

    // Review activity widget
    'review.title': 'REVIEW DETAILS',
    'review.total': 'TOTAL',
    'review.thisMonth': 'THIS MONTH',
    'review.last7Days': 'LAST 7 DAYS',
    'review.ratingDist': 'RATING DISTRIBUTION',
    'review.next': 'next review:',

    // Stat chip labels
    'stat.today': 'TODAY',
    'stat.thisWeek': 'THIS WEEK',
    'stat.avgPerDay': 'AVG/DAY',
    'stat.learned': 'LEARNED',

    // Units
    'unit.days': 'days',
    'unit.times': 'times',
    'unit.cards': 'cards',
    'unit.vocab': 'vocabulary',
    'unit.kanji': 'kanji',

    // SRS state labels (stat counters)
    'srs.new': 'NEW',
    'srs.learning': 'LEARNING',
    'srs.review': 'REVIEW',
    'srs.mature': 'MASTERED',

    // SRS state labels (legend)
    'srs.new.legend': 'New',
    'srs.learning.legend': 'Learning',
    'srs.review.legend': 'Review',
    'srs.mature.legend': 'Mastered',

    // Learning analytics widget
    'analytics.title': 'LEARNING PROGRESS',
    'subject.vocab': 'VOCABULARY',
    'subject.kanji': 'KANJI',

    // Settings — dark mode
    'settings.darkMode.title': 'DARK MODE',
    'settings.on': 'On',
    'settings.off': 'Off',

    // Settings — sync
    'settings.sync.title': 'CLOUD SYNC',
    'settings.sync.enable': 'Enable sync',
    'settings.sync.syncing': 'Syncing...',
    'settings.sync.done': '✓ Synced',
    'settings.sync.syncNow': 'Sync now',
    'settings.sync.pending': 'pending',
    'settings.sync.locked': 'LOCKED',
    'settings.sync.loginRequired': 'Sign in required',
    'settings.sync.loginToSync': 'Sign in to sync',

    // Settings — account
    'settings.account.title': 'ACCOUNT',
    'settings.account.logout': 'Sign out',
    'settings.account.delete': 'Delete account',
    'settings.account.deleteConfirmTitle': 'CONFIRM ACCOUNT DELETION',
    'settings.account.deletePermanent': 'Delete permanently',

    // Common
    'common.cancel': 'Cancel',
    'common.or': 'OR',

    // Home page
    'home.tagline': 'JAPANESE · STUDY DAILY',
    'home.settings': 'Settings',
    'home.startStudy': 'START STUDYING',
    'home.details': 'DETAILS',
    'home.todayProgress': 'TODAY\'S PROGRESS',
    'home.reviewVocab': 'Review vocabulary',
    'home.reviewKanji': 'Review kanji',
    'home.exploreLessons': 'Explore lessons',

    // Auth
    'auth.login.title': 'SIGN IN',
    'auth.login.submit': 'Sign in',
    'auth.forgotPassword': 'Forgot password?',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.register': 'Sign up',

    // SW update banner
    'update.newVersion': 'New version available!',
    'update.reload': 'Reload',
  },
}

export function createTranslator(lang: Lang) {
  return (key: string): string =>
    translations[lang][key] ?? translations.vi[key] ?? key
}

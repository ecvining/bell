const m = require('mithril')

const ScheduleDisplay = require('./ScheduleDisplay')
const Page1 = require('./Page1')
const Popup = require('./Popup')
const SchoolIndicator = require('./SchoolIndicator')
const { default: ErrorIcon } = require('./ErrorIcon')
const Loading = require('./Loading').default
const SettingsIcon = require('./SettingsIcon').default
const ScrollArrow = require('./ScrollArrow').default

const SimpleLogger = require('../SimpleLogger').default
const logger = new SimpleLogger()
const AnalyticsManager = require('../AnalyticsManager2').default
const analyticsManager = new AnalyticsManager(logger)

const Index = {
  oninit: async function (vnode) {
    const onScroll = function (e) {
      if (window.pageYOffset > 250) {
        window.removeEventListener('scroll', onScroll)
        cookieManager.set('has_scrolled', true)
      }
    }

    const cookieManager = vnode.attrs.cookieManager
    if (!cookieManager.get('has_scrolled')) {
      window.addEventListener('scroll', onScroll)
    }
    vnode.attrs.notificationManager = require('../NotificationManager').default
    vnode.attrs.soundManager = require('../SoundManager').default
    const ThemeManager = require('../ThemeManager').default
    vnode.attrs.themeManager = new ThemeManager(vnode.attrs.cookieManager.get('theme'))
    const sourceManager = require('../SourceManager').default
    sourceManager.source = vnode.attrs.source
    const BellTimer = require('../BellTimer2').default
    const SynchronizedDate = require('../SynchronizedDate').default
    const CorrectedDate = require('../CorrectedDate').default
    const bellTimer = new BellTimer(
      sourceManager.source,
      new CorrectedDate(new SynchronizedDate()),
      cookieManager.get('periods', {}),
      cookieManager.get('courses', {}))
    global.bellTimer = bellTimer
    vnode.attrs.bellTimer = bellTimer
    vnode.attrs.cookieManager = cookieManager
    vnode.attrs.periodInTitle = cookieManager.get('title_period', true)
    const ChromeExtensionMessenger = require('../ChromeExtensionMessenger')
    const chromeExtensionMessenger = new ChromeExtensionMessenger()
    // CHANGE THIS FOR LOCAL TESTING TO THE ID FOUND IN CHROME://EXTENSIONS
    chromeExtensionMessenger.connect('pkeeekfbjjpdkbijkjfljamglegfaikc')
    try {
      await bellTimer.initialize()

      // Will only get to here if the source is valid
      // Report analytics here since we have a valid source
      // If there is an invalid source, it will be reset
      // in the following catch block and we'll run again in
      // the next load.
      // TODO: Move this somewhere that makes more sense
      await analyticsManager.reportAnalytics()
    } catch (e) {
      await sourceManager.clearSource()
      vnode.attrs.error = [m('span', 'School not found'), m('br'), m('a[href=/settings]', {
        oncreate: m.route.link
      }, 'Try another')]
    }
  },
  view: function (vnode) {
    if (!vnode.attrs.bellTimer || !vnode.attrs.bellTimer.initialized) {
      if (vnode.attrs.error) {
        return m(ErrorIcon, vnode.attrs.error)
      }
      return m(Loading, 'Synchronizing')
    }
    return [
      m('span', {
        style: {
          'font-size': (Math.min(window.innerHeight * 0.3, window.innerWidth * 0.2) * 0.1) + 'px'
        }
      }, [
        m(Page1, vnode.attrs),
        m('.container#page2', [
          m(ScheduleDisplay, vnode.attrs),
          m(SettingsIcon)
        ])
      ]),
      m(SchoolIndicator, vnode.attrs, (vnode.attrs.bellTimer.meta || {}).name || ''),
      m(Popup, vnode.attrs),
      m(ScrollArrow, { visible: vnode.attrs.cookieManager.get('has_scrolled') })
    ]
  },
  onremove: function (vnode) {
    vnode.attrs.bellTimer.stopRefreshing()
  }
}

module.exports = Index

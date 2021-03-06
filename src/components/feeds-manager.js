const ff = require('../utils/fanfou')
const count = 60

function loadMore (page, url, para) {
  if (page.isloadingmore) {
    return
  }
  page.isloadingmore = true
  const param = Object.assign({ count: count, max_id: page.data.feeds_arr.slice(-1)[0].slice(-1)[0].id, format: 'html', mode: 'lite' }, para)
  ff.getPromise(url || '/statuses/home_timeline', param)
    .then(res => {
      page.isloadingmore = false
      page.setData({
        ['feeds_arr[' + page.data.feeds_arr.length + ']']: res.obj
      })
    })
    .catch(err => {
      page.isloadingmore = false
      console.error(err)
    })
}

function load (page, url, para, completion) {
  const param = Object.assign({ count: count, format: 'html', mode: 'lite' }, para)
  ff.getPromise(url || '/statuses/home_timeline', param)
    .then(res => {
      wx.stopPullDownRefresh()
      page.isloadingmore = false // 防止刷不出来更多，在这里重置下
      page.setData({
        hideLoader: true,
        feeds_arr: [res.obj] // 清空了全部，todo 只加载最新
      })
      completion(page)
    })
    .catch(err => {
      console.error(err)
      completion(page)
    })
}

function show (id, page) {
  ff.getPromise('/statuses/show', { id: id, format: 'html', mode: 'lite' })
    .then(res => {
      wx.stopPullDownRefresh()
      res.obj.isme = res.obj.user.unique_id === getApp().globalData.account.user.unique_id
      page.setData({
        feed: res.obj,
        feeds: [res.obj]
      })
    })
    .catch(err => console.error(err))
}

function favoriteChange (page) {
  console.log('favoriteChange')
  if (page.data.feed.favorited) {
    ff.postPromise('/favorites/destroy/' + page.data.feed.id)
      .then(res => {
        page.setData({
          'feed.favorited': false
        })
      })
      .catch(err => {
        wx.showToast({
          title: '错误',
          image: '/assets/toast_fail.png',
          duration: 500
        })
        console.error(err)
      })
  } else {
    ff.postPromise('/favorites/create/' + page.data.feed.id)
      .then(res => {
        page.setData({
          'feed.favorited': true
        })
      })
      .catch(err => {
        wx.showToast({
          title: '错误',
          image: '/assets/toast_fail.png',
          duration: 500
        })
        console.error(err)
      })
  }
}

function destroy (id) {
  ff.postPromise('/statuses/destroy', { id: id })
    .then(res => {
      wx.navigateBack({
        success: function () {
          wx.showToast({
            title: '已删除',
            image: '/assets/toast_delete.png',
            duration: 500
          })
          const page = getCurrentPages().slice(-1)[0]
          for (const [feedsIndex, feeds] of page.data.feeds_arr.entries()) {
            console.log('out' + feedsIndex)
            let breakFlag = false
            for (const [feedIndex, feed] of feeds.entries()) {
              console.log('inside' + feedIndex)
              if (feed.id === id) {
                console.log('find')
                console.log(feedIndex)
                page.data.feeds_arr[feedsIndex].splice(feedIndex, 1)
                page.setData({
                  [`feeds_arr[${feedsIndex}]`]: page.data.feeds_arr[feedsIndex]
                })
                breakFlag = true
              }
            }
            if (breakFlag) break
          }
        }
      })
    })
    .catch(err => {
      wx.showToast({
        title: '错误',
        image: '/assets/toast_fail.png',
        duration: 500
      })
      console.error(err)
    })
}

function post (param, page) {
  const image = param.repost_status_id ? '/assets/toast_repost.png' : param.in_reply_to_status_id ? '/assets/toast_reply.png' : '/assets/toast_post.png'
  const title = param.repost_status_id ? '已转发' : param.in_reply_to_status_id ? '已回复' : '已发布'
  ff.postPromise('/statuses/update', param)
    .then(res => {
      wx.showToast({
        title: title,
        image: image,
        duration: 500
      })
      page.setData({
        param: null
      })
    })
    .catch(err => {
      wx.showToast({
        title: '错误',
        image: '/assets/toast_fail.png',
        duration: 500
      })
      console.error(err)
    })
}

function showImage (url) {
  wx.previewImage({
    current: url,
    urls: [url]
  })
}

function showUser (user) {
  user.isme = user.unique_id === getApp().globalData.account.user.unique_id
  getApp().globalData.user = user
  wx.navigateTo({
    url: `../userprofile/userprofile?id=${user.id}`
  })
}

function showFeed (feed) {
  feed.isme = feed.user.unique_id === getApp().globalData.account.user.unique_id
  getApp().globalData.feed = feed
  wx.navigateTo({
    url: `../feed/feed?id=${feed.id}`
  })
}

function getAts (status) {
  const fanfouId = getApp().globalData.account.user.id
  let ats = []
  ats.push(`@${status.user.name}`)
  status.txt.forEach(item => {
    if (item.type === 'at' && item.id !== fanfouId) ats.push(item.text)
  })
  return [...(new Set(ats))].join(' ') + ' '
}

module.exports.load = load
module.exports.loadMore = loadMore
module.exports.show = show
module.exports.destroy = destroy
module.exports.post = post
module.exports.load = load
module.exports.getAts = getAts
module.exports.favoriteChange = favoriteChange
module.exports.showUser = showUser
module.exports.showFeed = showFeed
module.exports.showImage = showImage

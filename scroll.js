/*
 license: The MIT License, Copyright (c) 2020 YUKI "Piro" Hiroshi
 original:
   https://github.com/piroor/webextensions-lib-scroll
*/
'use strict';

function nextFrame() {
  return new Promise((resolve, _reject) => {
    window.requestAnimationFrame(resolve);
  });
}

export default class Scroll {
  constructor(container, { duration = 150 }) {
    this._container       = container;
    this._defaultDuration = duration;
  }

  scrollTo({ justNow, item, position, delta } = {}) {
    //console.log('scrollTo ', params);
    if (!justNow)
      return this.smoothScrollTo(params);

    if (item)
      this._container.scrollTop += this._calculateScrollDeltaForItem(item);
    else if (typeof position == 'number')
      this._container.scrollTop = position;
    else if (typeof delta == 'number')
      this._container.scrollTop += delta;
    else
      throw new Error('No parameter to indicate scroll position');
  }

  _cancelRunningScroll() {
    this._scrollToItemStopped = true;
    this._stopSmoothScroll();
  }

  _calculateScrollDeltaForItem(item) {
    const itemRect      = item.getBoundingClientRect();
    const containerRect = this._container.getBoundingClientRect();
    const offset        = this._smoothScrollToCurrentOffset;
    let delta           = 0;
    if (containerRect.bottom < itemRect.bottom + offset) { // should scroll down
      delta = itemRect.bottom - containerRect.bottom + offset;
      delta += 10; // should show a half of next item
    }
    else if (containerRect.top > itemRect.top + offset) { // should scroll up
      delta = itemRect.top - containerRect.top + offset;
      delta -= 10; // should show a half of next item
    }
    return delta;
  }

  isItemVisible(item) {
    return this._calculateScrollDeltaForItem(item) == 0;
  }

  async smoothScrollTo({ position, delta, item, duration } = {}) {
    //console.log('smoothScrollTo ', params);

    this._smoothScrollToStopped = false;

    let startPosition = this._container.scrollTop;
    let endPosition;
    if (item) {
      delta       = this._calculateScrollDeltaForItem(item);
      endPosition = startPosition + delta;
    }
    else if (typeof position == 'number') {
      endPosition = position;
      delta       = endPosition - startPosition;
    }
    else if (typeof delta == 'number') {
      endPosition = startPosition + delta;
    }
    else {
      throw new Error('No parameter to indicate scroll position');
    }
    this._smoothScrollToCurrentOffset = delta;

    duration = duration || this._defaultDuration;
    let startTime = Date.now();

    return new Promise((resolve, reject) => {
      let radian = 90 * Math.PI / 180;
      let scrollStep = () => {
        if (this._smoothScrollToStopped) {
          this._smoothScrollToCurrentOffset = 0;
          reject();
          return;
        }
        let nowTime = Date.now();
        let spentTime = nowTime - startTime;
        if (spentTime >= duration) {
          this.scrollTo({
            position: endPosition,
            justNow: true
          });
          this._smoothScrollToStopped       = true;
          this._smoothScrollToCurrentOffset = 0;
          resolve();
          return;
        }
        let power        = Math.sin(spentTime / duration * radian);
        let currentDelta = parseInt(delta * power);
        let newPosition  = startPosition + currentDelta;
        this.scrollTo({
          position: newPosition,
          justNow:  true
        });
        this._smoothScrollToCurrentOffset = currentDelta;
        nextFrame().then(scrollStep);
      };
      nextFrame().then(scrollStep);
    });
  }

  _stopSmoothScroll() {
    this._smoothScrollToStopped = true;
  }

  isSmoothScrolling() {
    return !this._smoothScrollToStopped;
  }

  async scrollToItem(item, options = {}) {
    this._cancelRunningScroll();

    this._scrollToItemStopped = false;
    await nextFrame();
    if (this._scrollToItemStopped)
      return;

    if (this.isItemVisible(item)) {
      //console.log('=> already visible');
      return;
    }

    // wait for one more frame, to start collapse/expand animation
    await nextFrame();
    if (this._scrollToItemStopped)
      return;

    this.scrollTo(Object.assign({}, options, {
      position: this._container.scrollTop + this._calculateScrollDeltaForItem(item)
    }));
  }
}

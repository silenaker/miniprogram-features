// index.js
// 获取应用实例
const app = getApp();

Page({
  data: {},

  createPoster() {
    wx.showLoading({ title: "海报生成中~", mask: true });
    this.renderPoster()
      .then((tmpPath) => {
        wx.hideLoading();
        return this.savePoster(tmpPath);
      })
      .then(() => {
        wx.showToast({
          title: "保存成功~",
          icon: "success",
          duration: 2000,
        });
      })
      .catch((errMsg) => {
        wx.showToast({
          title: errMsg,
          icon: "error",
          duration: 2000,
        });
      });
  },

  renderPoster() {
    return new Promise((resolve, reject) => {
      wx.createSelectorQuery()
        .select("#poster")
        .fields({ node: true, size: true })
        .exec((res) => {
          const canvas = res[0].node;
          const ctx = canvas.getContext("2d");
          const CANVAS_WIDTH = 750;
          const CANVAS_HEIGHT = 1440;

          // 设置 canvas 宽高
          canvas.width = CANVAS_WIDTH;
          canvas.height = CANVAS_HEIGHT;

          const drawImage = (ctx, url, ...args) =>
            new Promise((resolve, reject) => {
              const image = canvas.createImage();
              image.src = url;
              image.onload = () => {
                ctx.drawImage(image, ...args);
                resolve();
              };
              image.onerror = () => reject();
            });

          // 背景（本地路径）
          drawImage(ctx, "/assets/ink_wash.jpeg", 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
            .then(() => {
              // 裁剪绘图
              ctx.save();
              ctx.beginPath();

              const AVATAR_X = 100;
              const AVATAR_Y = 100;
              const AVATAR_WIDTH = 60;
              const AVATAR_HEIGHT = 60;
              const avatarUrl =
                "https://raw.githubusercontent.com/silenaker/miniprogram-features/master/assets/avatar.jpg";

              /* docs: https://www.w3.org/TR/2dcontext/#building-paths */
              ctx.arc(
                AVATAR_X + AVATAR_WIDTH / 2,
                AVATAR_Y + AVATAR_HEIGHT / 2,
                AVATAR_WIDTH / 2,
                0,
                Math.PI * 2,
                false
              );
              ctx.clip();

              return drawImage(
                ctx,
                avatarUrl,
                AVATAR_X,
                AVATAR_Y,
                AVATAR_WIDTH,
                AVATAR_HEIGHT
              ).then(() => {
                ctx.restore();
              });
            })
            .then(() => {
              // 文本
              const text = "Hello World";

              ctx.save();
              ctx.font = "normal normal 30px sans-serif";
              ctx.fillStyle = "black";
              ctx.textBaseline = "middle";
              ctx.fillText(text, 180, 130);
              ctx.restore();
            })
            .then(() => {
              // 小程序码（网络路径）
              const url =
                "https://raw.githubusercontent.com/silenaker/miniprogram-features/master/assets/mp_demo.png";
              return drawImage(ctx, url, 600, 1300, 100, 100);
            })
            .then(() => {
              return new Promise((resolve, reject) => {
                wx.canvasToTempFilePath({
                  x: 0,
                  y: 0,
                  width: CANVAS_WIDTH,
                  height: CANVAS_HEIGHT,
                  destWidth: CANVAS_WIDTH,
                  destHeight: CANVAS_HEIGHT,
                  canvas,
                  success(res) {
                    resolve(res.tempFilePath);
                  },
                  fail(err) {
                    reject(err);
                  },
                });
              });
            })
            .then(resolve)
            .catch((err) => {
              console.error(err);
              reject(typeof err === "string" ? err : "出错了~");
            });
        });
    });
  },

  savePoster(tmpPath) {
    return new Promise((resolve, reject) => {
      console.info("poster tmp path:", tmpPath);

      const writePhotosAlbum = () =>
        new Promise((resolve, reject) => {
          wx.getSetting({
            success(res) {
              if (res.authSetting["scope.writePhotosAlbum"]) {
                resolve(true);
              } else {
                wx.authorize({
                  scope: "scope.writePhotosAlbum",
                  success() {
                    resolve(true);
                  },
                  fail() {
                    resolve(false);
                  },
                });
              }
            },
            fail(err) {
              reject(err);
            },
          });
        });

      const openSetting = () =>
        new Promise((resolve, reject) => {
          wx.openSetting({
            success(res) {
              resolve(res.authSetting["scope.writePhotosAlbum"]);
            },
            fail(err) {
              reject(err);
            },
          });
        });

      const showModal = (options) =>
        new Promise((resolve, reject) => {
          wx.showModal({
            ...options,
            success(res) {
              res.confirm ? resolve() : reject();
            },
            fail() {
              reject();
            },
          });
        });

      const saveImageToPhotosAlbum = (filePath) =>
        new Promise((resolve, reject) => {
          wx.saveImageToPhotosAlbum({
            filePath,
            success() {
              resolve();
            },
            fail(err) {
              reject(err);
            },
          });
        });

      writePhotosAlbum()
        .then((writeEnabled) => {
          if (writeEnabled) {
            return saveImageToPhotosAlbum(tmpPath);
          } else {
            return showModal({
              title: "提示",
              content: "相册还未授权，马上去配置",
              showCancel: true,
            })
              .then(() => openSetting())
              .catch((err) => {
                err && console.error(err);
                return Promise.reject("相册未授权~");
              })
              .then((writeEnabled) => {
                if (writeEnabled) {
                  return saveImageToPhotosAlbum(tmpPath);
                } else {
                  return Promise.reject("相册未授权~");
                }
              });
          }
        })
        .then(resolve)
        .catch((err) => {
          console.error(err);
          reject(typeof err === "string" ? err : "保存失败~");
        });
    });
  },
});

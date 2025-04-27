export default function observeLoad() {
  window.addEventListener(
    'load',
    event => {
      requestAnimationFrame(() => {
        ['load'].forEach(type => {
          const reportData = {
            type: 'preformance',
            subType: type,
            pageUrl: window.location.href,
            startTime: performance.now() - event?.timeStamp,
          };
          console.log('Performance Load Event:', reportData);
        });
      });
    },
    true,
  );
}

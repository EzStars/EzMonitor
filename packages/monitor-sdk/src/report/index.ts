import { reportDataInterface } from './types';

// 定义数据上报函数
function reportData(options: reportDataInterface) {
  const { url, data, delay = 1000 } = options;
  setTimeout(() => {
    fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
      })
      .then(data => {
        console.log('Data successfully reported:', data);
      })
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
      });
  }, delay);
}
export default reportData;

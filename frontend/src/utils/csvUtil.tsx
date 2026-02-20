import Papa from 'papaparse';

export function csvToJson<T = Record<string, string>>(filename: File): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(filename, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as T[]);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
}
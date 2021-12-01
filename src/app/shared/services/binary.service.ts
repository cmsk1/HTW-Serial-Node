import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class BinaryService {

  static binToNumber(binary: string) {
    return Number.parseInt(binary.toString(), 2);;
  }

  static binToString(str: string) {
    // Removes the spaces from the binary string
    str = str.replace(/\s+/g, '');
    // Pretty (correct) print binary (add a space every 8 characters)
    str = str.match(/.{1,8}/g).join(' ');

    const newBinary = str.split(' ');
    const binaryCode = [];

    for (const item of newBinary) {
      binaryCode.push(String.fromCharCode(parseInt(item, 2)));
    }

    return binaryCode.join('');
  }

  static stringToBin(str: string): string {
    let result = '';
    for (let i = 0; i < str.length; i++) {
      result += str.charCodeAt(i).toString(2).padStart(8, '0');
    }

    return result;
  }


}

// GSM USB Dongle & Web Serial Service
// Handles connection, AT commands, sending and receiving SMS via USB GSM modems

export interface GsmDeviceStatus {
  isConnected: boolean;
  portName: string;
  baudRate: number;
  manufacturer: string;
  model: string;
  imei: string;
  operator: string;
  signalStrength: number; // 0-100%
  csqRaw: number; // 0-31
  simStatus: 'ready' | 'pin_required' | 'not_inserted' | 'unknown';
  storageUsed: number;
  storageTotal: number;
  isSimulated: boolean;
  lastChecked: string;
}

export interface GsmReceivedMessage {
  index: number;
  sender: string;
  text: string;
  timestamp: string;
  status: 'read' | 'unread';
  raw?: string;
}

export interface GsmSentResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipient?: string;
  timestamp?: string;
  partsCount?: number;
}

export interface AtLogEntry {
  id: string;
  time: string;
  type: 'sent' | 'received' | 'error' | 'info';
  text: string;
}

// Convert Persian / Unicode string to UCS2 HEX (Big Endian) for GSM AT+CMGS
export function textToHexUcs2(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hex += code.toString(16).padStart(4, '0').toUpperCase();
  }
  return hex;
}

// Decode UCS2 HEX string back to readable text (handles Persian / Arabic)
export function hexUcs2ToText(hex: string): string {
  if (!hex || hex.length < 4 || hex.length % 4 !== 0) return hex;
  try {
    let result = '';
    for (let i = 0; i < hex.length; i += 4) {
      const code = parseInt(hex.substr(i, 4), 16);
      result += String.fromCharCode(code);
    }
    return result;
  } catch {
    return hex;
  }
}

// Check if string is pure UCS-2 hex
export function isHexUcs2(str: string): boolean {
  if (!str || str.length < 4 || str.length % 4 !== 0) return false;
  return /^[0-9A-Fa-f]+$/.test(str.trim());
}

class GsmUsbService {
  private serialPort: any = null;
  private reader: any = null;
  private writer: any = null;
  private isReading = false;
  private readBuffer = '';
  private commandQueue: {
    command: string;
    resolve: (val: string) => void;
    reject: (err: any) => void;
    timeoutMs: number;
  }[] = [];
  private isProcessingCommand = false;

  private listeners: ((status: GsmDeviceStatus) => void)[] = [];
  private logListeners: ((log: AtLogEntry) => void)[] = [];
  private messageListeners: ((msg: GsmReceivedMessage) => void)[] = [];

  private logs: AtLogEntry[] = [];
  private receivedMessages: GsmReceivedMessage[] = [];

  public status: GsmDeviceStatus = {
    isConnected: false,
    portName: 'USB-Serial (شناسایی خودکار)',
    baudRate: 115200,
    manufacturer: 'GSM USB Dongle',
    model: 'سخت‌افزار مودم سیم‌کارتی',
    imei: '867534029182736',
    operator: 'همراه اول (IR-MCI)',
    signalStrength: 85,
    csqRaw: 26,
    simStatus: 'ready',
    storageUsed: 3,
    storageTotal: 30,
    isSimulated: true, // Default to simulated so it works out-of-the-box in preview
    lastChecked: 'هم‌اکنون'
  };

  constructor() {
    this.loadPersistedData();
    // Pre-populate some realistic received messages in simulation mode if empty
    if (this.receivedMessages.length === 0) {
      this.receivedMessages = [
        {
          index: 1,
          sender: '09121234567',
          text: 'سلام و احترام، وجه فاکتور شماره ۱۰۴۲ به حساب شما واریز شد. لطفا تایید بفرمایید.',
          timestamp: '1403/04/18 10:24',
          status: 'read'
        },
        {
          index: 2,
          sender: '09359876543',
          text: 'درود، لطفا پیش‌فاکتور اقلام سفارشی دیروز را از طریق همین شماره ارسال کنید.',
          timestamp: '1403/04/18 11:45',
          status: 'unread'
        },
        {
          index: 3,
          sender: '09195551234',
          text: 'سلام، چک مربوط به قرارداد تیرماه پاس شد. سپاس از همکاری.',
          timestamp: '1403/04/18 14:10',
          status: 'read'
        }
      ];
    }
  }

  private loadPersistedData() {
    try {
      const savedMessages = localStorage.getItem('gsm_received_messages');
      if (savedMessages) {
        this.receivedMessages = JSON.parse(savedMessages);
      }
      const savedStatus = localStorage.getItem('gsm_device_status');
      if (savedStatus) {
        const parsed = JSON.parse(savedStatus);
        this.status = { ...this.status, ...parsed };
      }
    } catch (e) {
      console.warn('Could not load GSM persisted data:', e);
    }
  }

  private persistData() {
    try {
      localStorage.setItem('gsm_received_messages', JSON.stringify(this.receivedMessages));
      localStorage.setItem('gsm_device_status', JSON.stringify({
        portName: this.status.portName,
        baudRate: this.status.baudRate,
        isSimulated: this.status.isSimulated,
        operator: this.status.operator
      }));
    } catch (e) {
      console.warn('Could not persist GSM data:', e);
    }
  }

  public isWebSerialSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public addStatusListener(cb: (status: GsmDeviceStatus) => void) {
    this.listeners.push(cb);
    cb(this.status);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  public addLogListener(cb: (log: AtLogEntry) => void) {
    this.logListeners.push(cb);
    return () => {
      this.logListeners = this.logListeners.filter(l => l !== cb);
    };
  }

  public addMessageListener(cb: (msg: GsmReceivedMessage) => void) {
    this.messageListeners.push(cb);
    return () => {
      this.messageListeners = this.messageListeners.filter(l => l !== cb);
    };
  }

  private notifyStatus() {
    this.listeners.forEach(cb => cb({ ...this.status }));
    this.persistData();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gsm_status_changed', { detail: this.status }));
    }
  }

  private addLog(type: AtLogEntry['type'], text: string) {
    const entry: AtLogEntry = {
      id: Math.random().toString(36).substring(2, 9),
      time: new Date().toLocaleTimeString('fa-IR'),
      type,
      text
    };
    this.logs.unshift(entry);
    if (this.logs.length > 200) this.logs.pop();
    this.logListeners.forEach(cb => cb(entry));
  }

  public getLogs(): AtLogEntry[] {
    return [...this.logs];
  }

  public getReceivedMessages(): GsmReceivedMessage[] {
    return [...this.receivedMessages];
  }

  // Connect using browser's Web Serial API to a physical USB GSM Dongle
  public async connectUsbPort(baudRate = 115200): Promise<{ success: boolean; message: string }> {
    if (!this.isWebSerialSupported()) {
      // In non-supported environments, fallback smoothly to simulated mode
      this.status.isSimulated = true;
      this.status.isConnected = true;
      this.status.baudRate = baudRate;
      this.status.portName = `پورت مجازی USB (حالت آزمایشگاهی)`;
      this.addLog('info', `مرورگر شما از Web Serial API پشتیبانی نمی‌کند یا دسترسی محدود است. حالت شبیه‌ساز سخت‌افزار فعال شد.`);
      this.notifyStatus();
      return {
        success: true,
        message: 'دستگاه در حالت شبیه‌ساز آماده‌به‌کار شد (پشتیبانی کامل از ارسال و دریافت).'
      };
    }

    try {
      this.addLog('info', 'درخواست انتخاب پورت USB مودم GSM از کاربر...');
      const serial = (navigator as any).serial;
      const port = await serial.requestPort();
      await port.open({ baudRate });

      this.serialPort = port;
      this.status.isConnected = true;
      this.status.isSimulated = false;
      this.status.baudRate = baudRate;
      this.status.portName = `پورت سریال USB (${baudRate} bps)`;
      this.addLog('info', `پورت با موفقیت باز شد (BaudRate: ${baudRate})`);

      this.startReading();
      await this.runInitialHardwareSetup();

      this.notifyStatus();
      return { success: true, message: 'دستگاه مودم GSM با موفقیت از پورت USB متصل شد.' };
    } catch (err: any) {
      console.warn('Web Serial open failed or cancelled:', err);
      this.addLog('error', `خطا در باز کردن پورت USB: ${err.message || err}`);
      return { success: false, message: err.message || 'اتصال پورت لغو یا با خطا مواجه شد.' };
    }
  }

  // Toggle or switch to Simulated Mode
  public setSimulationMode(enabled: boolean) {
    if (enabled) {
      if (this.serialPort) {
        this.disconnect();
      }
      this.status.isSimulated = true;
      this.status.isConnected = true;
      this.status.portName = 'پورت شبیه‌ساز سخت‌افزار (Virtual USB GSM)';
      this.status.operator = 'همراه اول (IR-MCI)';
      this.status.signalStrength = 88;
      this.status.csqRaw = 27;
      this.status.simStatus = 'ready';
      this.addLog('info', 'مودم GSM در حالت شبیه‌ساز سخت‌افزاری فعال شد.');
    } else {
      this.status.isSimulated = false;
      this.status.isConnected = false;
      this.status.portName = 'بدون اتصال فیزیکی';
      this.addLog('info', 'حالت شبیه‌ساز غیرفعال شد.');
    }
    this.notifyStatus();
  }

  public async disconnect(): Promise<void> {
    this.isReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader.releaseLock();
        this.reader = null;
      }
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }
      if (this.serialPort) {
        await this.serialPort.close();
        this.serialPort = null;
      }
    } catch (e) {
      console.warn('Disconnect cleanup notice:', e);
    }
    this.status.isConnected = false;
    this.addLog('info', 'ارتباط پورت مودم قطع شد.');
    this.notifyStatus();
  }

  private async startReading() {
    if (!this.serialPort || !this.serialPort.readable) return;
    this.isReading = true;
    const textDecoder = new TextDecoderStream();
    this.serialPort.readable.pipeTo(textDecoder.writable);
    this.reader = textDecoder.readable.getReader();

    try {
      while (this.isReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) {
          this.readBuffer += value;
          this.handleIncomingData(value);
        }
      }
    } catch (err: any) {
      console.warn('Serial read stream ended or errored:', err);
    } finally {
      this.isReading = false;
    }
  }

  private handleIncomingData(chunk: string) {
    this.addLog('received', chunk.trim());

    // Check for unsolicited result codes like new SMS arrived: +CMTI: "SM", 4
    if (chunk.includes('+CMTI:')) {
      const match = chunk.match(/\+CMTI:\s*"[^"]*",\s*(\d+)/);
      if (match && match[1]) {
        const idx = parseInt(match[1], 10);
        this.addLog('info', `پیامک جدید در خانه حافظه ${idx} سیم‌کارت دریافت شد. در حال بازخوانی...`);
        this.readSingleMessage(idx);
      }
    }
  }

  // Send raw AT command to device
  public async executeAtCommand(cmd: string, timeoutMs = 4000): Promise<string> {
    this.addLog('sent', cmd);

    if (this.status.isSimulated || !this.serialPort) {
      return this.simulateAtCommandResponse(cmd);
    }

    return new Promise((resolve, reject) => {
      this.commandQueue.push({ command: cmd, resolve, reject, timeoutMs });
      this.processNextCommand();
    });
  }

  private async processNextCommand() {
    if (this.isProcessingCommand || this.commandQueue.length === 0) return;
    this.isProcessingCommand = true;

    const item = this.commandQueue.shift()!;
    const encoder = new TextEncoder();
    const formattedCmd = item.command.endsWith('\r') || item.command.endsWith('\r\n') 
      ? item.command 
      : item.command + '\r\n';

    try {
      if (!this.writer && this.serialPort?.writable) {
        this.writer = this.serialPort.writable.getWriter();
      }
      if (!this.writer) {
        throw new Error('پورت سریال برای نوشتن آماده نیست');
      }

      this.readBuffer = '';
      await this.writer.write(encoder.encode(formattedCmd));

      // Wait for OK or ERROR or timeout
      const startTime = Date.now();
      const checkResponse = () => {
        if (this.readBuffer.includes('OK') || this.readBuffer.includes('ERROR') || this.readBuffer.includes('> ')) {
          const res = this.readBuffer;
          this.isProcessingCommand = false;
          item.resolve(res);
          this.processNextCommand();
          return;
        }
        if (Date.now() - startTime > item.timeoutMs) {
          this.isProcessingCommand = false;
          item.resolve(this.readBuffer || 'TIMEOUT');
          this.processNextCommand();
          return;
        }
        setTimeout(checkResponse, 50);
      };
      checkResponse();
    } catch (err) {
      this.isProcessingCommand = false;
      item.reject(err);
      this.processNextCommand();
    }
  }

  private simulateAtCommandResponse(cmd: string): Promise<string> {
    const cleanCmd = cmd.trim().toUpperCase();
    return new Promise((resolve) => {
      setTimeout(() => {
        let resp = 'OK';
        if (cleanCmd === 'AT') {
          resp = 'OK';
        } else if (cleanCmd.startsWith('AT+CSQ')) {
          resp = '+CSQ: 26,99\r\nOK';
          this.status.signalStrength = 84;
          this.status.csqRaw = 26;
        } else if (cleanCmd.startsWith('AT+COPS?')) {
          resp = '+COPS: 0,0,"IR-MCI",7\r\nOK';
          this.status.operator = 'همراه اول (IR-MCI)';
        } else if (cleanCmd.startsWith('AT+CGMI')) {
          resp = 'SIMCOM_Ltd\r\nOK';
          this.status.manufacturer = 'SIMCOM Electronics';
        } else if (cleanCmd.startsWith('AT+CGMM')) {
          resp = 'SIM800C USB Modem\r\nOK';
          this.status.model = 'SIM800C GSM/GPRS Dongle';
        } else if (cleanCmd.startsWith('AT+CGSN')) {
          resp = '867534029182736\r\nOK';
          this.status.imei = '867534029182736';
        } else if (cleanCmd.startsWith('AT+CPIN?')) {
          resp = '+CPIN: READY\r\nOK';
          this.status.simStatus = 'ready';
        } else if (cleanCmd.startsWith('AT+CMGF=')) {
          resp = 'OK';
        } else if (cleanCmd.startsWith('AT+CMGS=')) {
          resp = '+CMGS: ' + Math.floor(Math.random() * 100 + 1) + '\r\nOK';
        } else if (cleanCmd.startsWith('AT+CMGL=')) {
          resp = `+CMGL: 1,"REC READ","09121234567","","1403/04/18 10:24"\r\nسلام و احترام، وجه فاکتور ۱۰۴۲ واریز شد.\r\n+CMGL: 2,"REC UNREAD","09359876543","","1403/04/18 11:45"\r\nدرود، پیش‌فاکتور اقلام سفارشی دیروز را ارسال کنید.\r\nOK`;
        }

        this.addLog('received', resp);
        this.notifyStatus();
        resolve(resp);
      }, 200);
    });
  }

  // Initial queries to get signal, operator, model
  public async runInitialHardwareSetup() {
    try {
      this.addLog('info', 'بررسی اولیه مودم و ارسال فرمان‌های آماده‌سازی...');
      await this.executeAtCommand('AT');
      await this.executeAtCommand('ATE0'); // Echo off
      await this.executeAtCommand('AT+CPIN?'); // SIM Ready?
      await this.executeAtCommand('AT+CMGF=1'); // Set SMS text mode
      await this.executeAtCommand('AT+CSCS="GSM"'); // Charset
      await this.executeAtCommand('AT+CNMI=2,1,0,0,0'); // Notifications for new incoming SMS
      
      // Get Signal
      const csqRes = await this.executeAtCommand('AT+CSQ');
      this.parseCsq(csqRes);

      // Get Operator
      const copsRes = await this.executeAtCommand('AT+COPS?');
      this.parseCops(copsRes);

      // Get IMEI
      const imeiRes = await this.executeAtCommand('AT+CGSN');
      this.parseImei(imeiRes);

      this.status.lastChecked = new Date().toLocaleTimeString('fa-IR');
      this.notifyStatus();
    } catch (err) {
      console.warn('Initial hardware setup warning:', err);
    }
  }

  private parseCsq(res: string) {
    const match = res.match(/\+CSQ:\s*(\d+)/);
    if (match && match[1]) {
      const csq = parseInt(match[1], 10);
      this.status.csqRaw = csq;
      // 0-31 scale to percentage (31 is 100%)
      const pct = Math.min(100, Math.round((csq / 31) * 100));
      this.status.signalStrength = pct;
    }
  }

  private parseCops(res: string) {
    const match = res.match(/"([^"]+)"/);
    if (match && match[1]) {
      let opName = match[1];
      if (opName.toUpperCase().includes('MCI') || opName.toUpperCase().includes('TCI')) opName = 'همراه اول (IR-MCI)';
      else if (opName.toUpperCase().includes('MTN') || opName.toUpperCase().includes('IRANCELL')) opName = 'ایرانسل (Irancell)';
      else if (opName.toUpperCase().includes('RIGHTEL')) opName = 'رایتل (Rightel)';
      this.status.operator = opName;
    }
  }

  private parseImei(res: string) {
    const match = res.match(/(\d{14,16})/);
    if (match && match[1]) {
      this.status.imei = match[1];
    }
  }

  // --- SENDING SMS VIA USB GSM MODEM ---
  public async sendSms(to: string, messageText: string): Promise<GsmSentResult> {
    if (!this.status.isConnected) {
      return { success: false, error: 'دستگاه مودم GSM متصل نیست.' };
    }

    if (!to || !to.trim()) {
      return { success: false, error: 'شماره گیرنده نامعتبر است.' };
    }

    const cleanNumber = to.trim().replace(/\s+/g, '');
    const parts = Math.ceil(messageText.length / 70) || 1;

    try {
      this.addLog('info', `در حال ارسال پیامک به ${cleanNumber} از طریق مودم GSM...`);

      if (this.status.isSimulated || !this.serialPort) {
        // Simulation delay
        await new Promise(r => setTimeout(r, 600));
        const msgId = `GSM-${Date.now().toString(36).toUpperCase()}`;
        this.addLog('received', `+CMGS: ${Math.floor(Math.random() * 50 + 1)}\r\nOK`);
        this.addLog('info', `پیامک با موفقیت از مودم ارسال شد (شناسه: ${msgId})`);

        const result: GsmSentResult = {
          success: true,
          messageId: msgId,
          recipient: cleanNumber,
          timestamp: new Date().toLocaleTimeString('fa-IR'),
          partsCount: parts
        };

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gsm_message_sent', { detail: result }));
        }

        return result;
      }

      // Real Hardware Transmission via AT Commands
      // 1. Ensure text mode
      await this.executeAtCommand('AT+CMGF=1');

      // Check if message has Persian / Non-ASCII
      const hasUnicode = /[^\u0000-\u007F]/.test(messageText);

      if (hasUnicode) {
        // Use UCS2 or HEX encoding if needed
        try {
          await this.executeAtCommand('AT+CSCS="HEX"');
        } catch {
          // fallback
        }
      }

      // 2. Issue AT+CMGS="phoneNumber"
      const cmgsCmd = `AT+CMGS="${cleanNumber}"`;
      this.addLog('sent', cmgsCmd);

      // Write body + Ctrl+Z (0x1A)
      const bodyToSend = hasUnicode ? textToHexUcs2(messageText) : messageText;
      const fullPayload = `${cmgsCmd}\r\n${bodyToSend}\x1A`;

      const encoder = new TextEncoder();
      if (!this.writer && this.serialPort?.writable) {
        this.writer = this.serialPort.writable.getWriter();
      }
      this.readBuffer = '';
      await this.writer.write(encoder.encode(fullPayload));

      // Await result
      const resp = await new Promise<string>((resolve) => {
        const start = Date.now();
        const interval = setInterval(() => {
          if (this.readBuffer.includes('OK') || this.readBuffer.includes('ERROR') || Date.now() - start > 12000) {
            clearInterval(interval);
            resolve(this.readBuffer);
          }
        }, 100);
      });

      if (resp.includes('OK')) {
        const msgId = `GSM-${Date.now().toString(36).toUpperCase()}`;
        this.addLog('info', `پیامک با موفقیت توسط مودم ارسال شد.`);
        const result: GsmSentResult = {
          success: true,
          messageId: msgId,
          recipient: cleanNumber,
          timestamp: new Date().toLocaleTimeString('fa-IR'),
          partsCount: parts
        };
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gsm_message_sent', { detail: result }));
        }
        return result;
      } else {
        throw new Error(resp || 'خطا در ارسال پیامک توسط مودم');
      }

    } catch (err: any) {
      this.addLog('error', `خطا در ارسال پیامک: ${err.message || err}`);
      return {
        success: false,
        error: err.message || 'خطای ناشناخته در ارسال با مودم GSM'
      };
    }
  }

  // --- RECEIVING SMS VIA USB GSM MODEM ---
  public async fetchReceivedMessages(): Promise<GsmReceivedMessage[]> {
    this.addLog('info', 'در حال بازخوانی پیامک‌های دریافتی از سیم‌کارت مودم...');

    if (this.status.isSimulated || !this.serialPort) {
      await new Promise(r => setTimeout(r, 400));
      this.addLog('info', `تعداد ${this.receivedMessages.length} پیامک در حافظه سیم‌کارت موجود است.`);
      return [...this.receivedMessages];
    }

    try {
      await this.executeAtCommand('AT+CMGF=1');
      await this.executeAtCommand('AT+CPMS="SM","SM","SM"');
      const raw = await this.executeAtCommand('AT+CMGL="ALL"', 8000);

      const parsed = this.parseCmglResponse(raw);
      if (parsed.length > 0) {
        this.receivedMessages = parsed;
        this.persistData();
      }
      this.addLog('info', `تعداد ${this.receivedMessages.length} پیامک از سیم‌کارت بازخوانی گردید.`);
      return [...this.receivedMessages];
    } catch (err: any) {
      this.addLog('error', `خطا در بازخوانی پیامک‌ها: ${err.message || err}`);
      return [...this.receivedMessages];
    }
  }

  private parseCmglResponse(raw: string): GsmReceivedMessage[] {
    const list: GsmReceivedMessage[] = [];
    const lines = raw.split(/\r?\n/);
    let currentMsg: Partial<GsmReceivedMessage> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('+CMGL:')) {
        // e.g., +CMGL: 1,"REC READ","09121234567","","26/09/09,10:30:00+14"
        const parts = line.match(/\+CMGL:\s*(\d+),\s*"([^"]*)",\s*"([^"]*)"(?:,[^,]*)?(?:,\s*"([^"]*)")?/);
        if (parts) {
          const index = parseInt(parts[1], 10);
          const status = parts[2].includes('UNREAD') ? 'unread' : 'read';
          const sender = parts[3];
          const timestamp = parts[4] || new Date().toLocaleString('fa-IR');

          currentMsg = {
            index,
            status,
            sender,
            timestamp,
            text: ''
          };
        }
      } else if (currentMsg && line && !line.startsWith('OK') && !line.startsWith('ERROR')) {
        // This is the message text line
        let textContent = line;
        if (isHexUcs2(line)) {
          textContent = hexUcs2ToText(line);
        }
        currentMsg.text = currentMsg.text ? `${currentMsg.text}\n${textContent}` : textContent;
        list.push(currentMsg as GsmReceivedMessage);
        currentMsg = null;
      }
    }

    return list;
  }

  public async readSingleMessage(index: number): Promise<GsmReceivedMessage | null> {
    try {
      const raw = await this.executeAtCommand(`AT+CMGR=${index}`, 4000);
      const parsed = this.parseCmglResponse(`+CMGL: ${index},` + raw);
      if (parsed[0]) {
        this.receivedMessages.unshift(parsed[0]);
        this.persistData();
        this.messageListeners.forEach(cb => cb(parsed[0]));
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gsm_message_received', { detail: parsed[0] }));
        }
        return parsed[0];
      }
    } catch (e) {
      console.warn('Error reading single message:', e);
    }
    return null;
  }

  public async deleteReceivedMessage(index: number): Promise<boolean> {
    try {
      this.addLog('sent', `AT+CMGD=${index}`);
      if (!this.status.isSimulated && this.serialPort) {
        await this.executeAtCommand(`AT+CMGD=${index}`);
      }
      this.receivedMessages = this.receivedMessages.filter(m => m.index !== index);
      this.persistData();
      this.addLog('info', `پیامک ردیف ${index} از سیم‌کارت حذف شد.`);
      return true;
    } catch (err: any) {
      this.addLog('error', `خطا در حذف پیامک: ${err.message || err}`);
      return false;
    }
  }

  // Add simulated incoming message for testing reception
  public simulateIncomingMessage(sender: string, text: string) {
    const newMsg: GsmReceivedMessage = {
      index: this.receivedMessages.length + 1,
      sender: sender || '09123456789',
      text: text || 'پیامک تستی دریافتی از طریق مودم GSM',
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      status: 'unread'
    };
    this.receivedMessages.unshift(newMsg);
    this.persistData();
    this.addLog('info', `پیامک ورودی جدید از ${newMsg.sender} دریافت شد.`);
    this.messageListeners.forEach(cb => cb(newMsg));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gsm_message_received', { detail: newMsg }));
    }
    return newMsg;
  }
}

export const gsmUsbService = new GsmUsbService();

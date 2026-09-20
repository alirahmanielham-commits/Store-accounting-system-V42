// GSM USB Dongle & Web Serial Service
// Handles connection, AT commands, sending and receiving SMS via USB GSM/3G modems (specifically ZyXEL 3G MAX218M / USB Dongles)

export interface GsmDeviceStatus {
  isConnected: boolean;
  portName: string;
  baudRate: number;
  manufacturer: string;
  model: string;
  deviceProfile?: 'zyxel_3g' | 'generic' | 'huawei_3g' | 'dlink_3g';
  imei: string;
  operator: string;
  signalStrength: number; // 0-100%
  csqRaw: number; // 0-31
  simStatus: 'ready' | 'pin_required' | 'not_inserted' | 'unknown';
  storageUsed: number;
  storageTotal: number;
  isSimulated: boolean;
  lastChecked: string;
  atResponsive?: boolean;
  preferredSmsMode?: 'auto' | 'pdu' | 'text';
  activeStorage?: 'SM' | 'ME' | 'MT' | 'ALL';
  smscNumber?: string;
  portHint?: string;
}

export interface GsmReceivedMessage {
  index: number;
  sender: string;
  text: string;
  timestamp: string;
  status: 'read' | 'unread';
  storage?: 'SM' | 'ME' | 'MT';
  raw?: string;
}

export interface GsmSentResult {
  success: boolean;
  messageId?: string;
  error?: string;
  recipient?: string;
  timestamp?: string;
  partsCount?: number;
  modeUsed?: 'pdu' | 'text' | 'simulated';
  rawResponse?: string;
}

export interface AtLogEntry {
  id: string;
  time: string;
  type: 'sent' | 'received' | 'error' | 'info';
  text: string;
}

export interface DiagnosticStepResult {
  step: number;
  title: string;
  command: string;
  status: 'pending' | 'success' | 'warning' | 'error';
  rawResponse?: string;
  detail: string;
  recommendation?: string;
}

// Convert Persian / Unicode string to UCS2 HEX (Big Endian)
export function textToHexUcs2(str: string): string {
  let hex = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    hex += code.toString(16).padStart(4, '0').toUpperCase();
  }
  return hex;
}

// Decode UCS2 HEX string back to readable Persian/Arabic/English text
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

// Check if string is pure UCS-2 hex (e.g. "0633064406270645")
export function isHexUcs2(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (trimmed.length < 4 || trimmed.length % 4 !== 0) return false;
  return /^[0-9A-Fa-f]+$/.test(trimmed);
}

// Encode SMS-SUBMIT PDU (GSM 03.40 standard - universally supported by all GSM/3G modems)
export function encodeSmsSubmitPdu(recipient: string, text: string): { pduHex: string; length: number } {
  let cleanNum = recipient.trim().replace(/[^\d+]/g, '');
  let isInternational = false;
  
  if (cleanNum.startsWith('+')) {
    isInternational = true;
    cleanNum = cleanNum.substring(1);
  } else if (cleanNum.startsWith('00')) {
    isInternational = true;
    cleanNum = cleanNum.substring(2);
  } else if (cleanNum.startsWith('09')) {
    isInternational = true;
    cleanNum = '98' + cleanNum.substring(1);
  } else if (cleanNum.startsWith('989')) {
    isInternational = true;
  }

  const digitCount = cleanNum.length;
  const addressLengthHex = digitCount.toString(16).padStart(2, '0').toUpperCase();
  const addressTypeHex = isInternational ? '91' : '81';

  // Semi-octet swapped
  let paddedNum = cleanNum;
  if (paddedNum.length % 2 !== 0) {
    paddedNum += 'F';
  }
  let swappedDigits = '';
  for (let i = 0; i < paddedNum.length; i += 2) {
    swappedDigits += paddedNum[i + 1] + paddedNum[i];
  }

  // Detect Unicode (Persian/Arabic)
  const isUnicode = /[^\u0000-\u007F]/.test(text);
  const dcsHex = isUnicode ? '08' : '00'; // 08 = 16-bit UCS2

  // Encode User Data
  let userDataHex = '';
  if (isUnicode) {
    for (let i = 0; i < text.length; i++) {
      userDataHex += text.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
    }
  } else {
    // Also use UCS2 for mixed/clean reliability if needed, or 16-bit
    for (let i = 0; i < text.length; i++) {
      userDataHex += text.charCodeAt(i).toString(16).padStart(4, '0').toUpperCase();
    }
  }
  const udl = userDataHex.length / 2; // length in octets
  const udlHex = udl.toString(16).padStart(2, '0').toUpperCase();

  // PDU Structure:
  // 00 = SMSC info length 0 (use default SMSC from SIM)
  // 01 = First octet (SMS-SUBMIT)
  // 00 = Message Reference (allocated by modem)
  // DA = Dest Address (Len + Type + Swapped)
  // 00 = Protocol Identifier
  // DCS = 08 (UCS2 16-bit)
  // UDL = User Data Length
  // UD = User Data Hex
  const smsc = '00';
  const firstOctet = '01';
  const mr = '00';
  const da = addressLengthHex + addressTypeHex + swappedDigits;
  const pid = '00';

  const pduBodyWithoutSmsc = firstOctet + mr + da + pid + '08' + udlHex + userDataHex;
  const fullPduHex = smsc + pduBodyWithoutSmsc;
  const pduLength = pduBodyWithoutSmsc.length / 2;

  return {
    pduHex: fullPduHex,
    length: pduLength
  };
}

// Decode SMS-DELIVER PDU (GSM 03.40 incoming SMS)
export function decodeSmsDeliverPdu(pduHex: string): { sender: string; text: string; timestamp: string } | null {
  try {
    const raw = pduHex.trim();
    if (raw.length < 20) return null;
    let offset = 0;

    // 1. SMSC Length
    const smscLen = parseInt(raw.substr(offset, 2), 16);
    offset += 2;
    if (smscLen > 0) {
      offset += smscLen * 2;
    }

    // 2. First octet of SMS-DELIVER
    offset += 2;

    // 3. Sender Address Length
    const senderLen = parseInt(raw.substr(offset, 2), 16);
    offset += 2;
    const senderType = raw.substr(offset, 2);
    offset += 2;

    const senderDigitsLen = senderLen % 2 === 0 ? senderLen : senderLen + 1;
    const rawSenderSwapped = raw.substr(offset, senderDigitsLen);
    offset += senderDigitsLen;

    let sender = '';
    for (let i = 0; i < rawSenderSwapped.length; i += 2) {
      sender += rawSenderSwapped[i + 1] + rawSenderSwapped[i];
    }
    if (sender.endsWith('F') || sender.endsWith('f')) {
      sender = sender.slice(0, -1);
    }
    if (senderType === '91' && !sender.startsWith('+')) {
      sender = '+' + sender;
    }

    // 4. Protocol Identifier
    offset += 2;

    // 5. Data Coding Scheme (DCS)
    const dcs = parseInt(raw.substr(offset, 2), 16);
    offset += 2;
    const isUcs2 = (dcs & 0x08) !== 0 || dcs === 8;

    // 6. Service Center Time Stamp (7 octets: YY MM DD HH MM SS TZ)
    const sctsRaw = raw.substr(offset, 14);
    offset += 14;
    let timestamp = '';
    if (sctsRaw.length === 14) {
      const year = sctsRaw[1] + sctsRaw[0];
      const month = sctsRaw[3] + sctsRaw[2];
      const day = sctsRaw[5] + sctsRaw[4];
      const hour = sctsRaw[7] + sctsRaw[6];
      const min = sctsRaw[9] + sctsRaw[8];
      const sec = sctsRaw[11] + sctsRaw[10];
      timestamp = `14${year}/${month}/${day} ${hour}:${min}:${sec}`;
    }

    // 7. User Data Length
    offset += 2;

    // 8. User Data
    const udHex = raw.substr(offset);
    let text = '';
    if (isUcs2) {
      text = hexUcs2ToText(udHex);
    } else {
      text = hexUcs2ToText(udHex) || udHex;
    }

    return {
      sender,
      text: text || '(پیام خالی)',
      timestamp: timestamp || new Date().toLocaleString('fa-IR')
    };
  } catch (e) {
    console.warn('PDU decode failed:', e);
    return null;
  }
}

// Friendly Persian descriptions for CMS ERROR codes
export function translateCmsError(errStr: string): string {
  if (errStr.includes('304')) return 'خطای 304: مودم تنها از پروتکل PDU پشتیبانی می‌کند (حالت ارسال خودکار PDU را انتخاب کنید)';
  if (errStr.includes('305')) return 'خطای 305: کاراکتر یا قالب نامعتبر در حالت متنی';
  if (errStr.includes('310')) return 'خطای 310: سیم‌کارت شناسایی نشد یا وارد نشده است';
  if (errStr.includes('311')) return 'خطای 311: سیم‌کارت قفل پین‌کد (PIN) دارد';
  if (errStr.includes('330')) return 'خطای 330: شماره مرکز خدمات پیامک (SMSC) روی سیم‌کارت تنظیم نشده است';
  if (errStr.includes('500')) return 'خطای 500: خطای شبکه مخابراتی، عدم آنتن‌دهی یا ناکافی بودن اعتبار ریالی سیم‌کارت';
  if (errStr.includes('512')) return 'خطای 512: مودم در شبکه ثبت نشده است (در حال جستجوی آنتن)';
  return errStr;
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
    portName: 'پورت USB (مودم ZyXEL 3G)',
    baudRate: 115200,
    manufacturer: 'ZyXEL Communications Corp.',
    model: 'ZyXEL 3G USB Modem (HSDPA)',
    deviceProfile: 'zyxel_3g',
    imei: '863920194827103',
    operator: 'همراه اول (IR-MCI)',
    signalStrength: 85,
    csqRaw: 26,
    simStatus: 'ready',
    storageUsed: 0,
    storageTotal: 30,
    isSimulated: true, // Default simulated so preview is usable without USB
    lastChecked: 'هم‌اکنون',
    atResponsive: true,
    preferredSmsMode: 'auto',
    activeStorage: 'ALL',
    portHint: 'در صورت کار نکردن، پورت دیگر مودم در لیست انتخاب شود'
  };

  public setDeviceProfile(profile: 'zyxel_3g' | 'generic' | 'huawei_3g' | 'dlink_3g') {
    this.status.deviceProfile = profile;
    if (profile === 'zyxel_3g') {
      this.status.manufacturer = 'ZyXEL Communications Corp.';
      this.status.model = 'ZyXEL 3G USB Modem (HSDPA)';
      this.status.baudRate = 115200;
    } else if (profile === 'huawei_3g') {
      this.status.manufacturer = 'Huawei Technologies Co.';
      this.status.model = 'Huawei E303 / E3531 USB';
      this.status.baudRate = 115200;
    } else if (profile === 'dlink_3g') {
      this.status.manufacturer = 'D-Link Corporation';
      this.status.model = 'D-Link DWM-157 3G';
      this.status.baudRate = 115200;
    } else {
      this.status.manufacturer = 'Generic GSM/3G Vendor';
      this.status.model = 'Standard 3G/GSM USB Modem';
      this.status.baudRate = 115200;
    }
    this.notifyStatus();
  }

  public setPreferredSmsMode(mode: 'auto' | 'pdu' | 'text') {
    this.status.preferredSmsMode = mode;
    this.addLog('info', `حالت ارسال پیامک به «${mode === 'auto' ? 'خودکار هوشمند (PDU / Text)' : mode === 'pdu' ? 'PDU جهانی' : 'متنی Text Mode'}» تغییر یافت.`);
    this.notifyStatus();
  }

  public setActiveStorage(storage: 'SM' | 'ME' | 'MT' | 'ALL') {
    this.status.activeStorage = storage;
    this.addLog('info', `حافظه فعال بازخوانی پیامک‌ها به «${storage}» تغییر یافت.`);
    this.notifyStatus();
  }

  constructor() {
    this.loadPersistedData();
    // In initial simulation state, populate demo messages
    if (this.receivedMessages.length === 0 && this.status.isSimulated) {
      this.receivedMessages = [
        {
          index: 1,
          sender: '09121234567',
          text: 'سلام و احترام، وجه فاکتور شماره ۱۰۴۲ به حساب شما واریز شد. لطفا تایید بفرمایید.',
          timestamp: '1403/04/18 10:24',
          status: 'read',
          storage: 'SM'
        },
        {
          index: 2,
          sender: '09359876543',
          text: 'درود، لطفا پیش‌فاکتور اقلام سفارشی دیروز را از طریق همین شماره ارسال کنید.',
          timestamp: '1403/04/18 11:45',
          status: 'unread',
          storage: 'SM'
        },
        {
          index: 3,
          sender: '09195551234',
          text: 'سلام، چک مربوط به قرارداد تیرماه پاس شد. سپاس از همکاری.',
          timestamp: '1403/04/18 14:10',
          status: 'read',
          storage: 'SM'
        }
      ];
      this.status.storageUsed = 3;
      this.status.storageTotal = 30;
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
        operator: this.status.operator,
        preferredSmsMode: this.status.preferredSmsMode,
        activeStorage: this.status.activeStorage
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
    if (this.logs.length > 300) this.logs.pop();
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
      this.status.isSimulated = true;
      this.status.isConnected = true;
      this.status.baudRate = baudRate;
      this.status.portName = `پورت شبیه‌ساز (مرورگر از Web Serial پشتیبانی نمی‌کند)`;
      this.addLog('info', `مرورگر فعلی از Web Serial API پشتیبانی نمی‌کند. حالت شبیه‌ساز فعال شد.`);
      this.notifyStatus();
      return {
        success: true,
        message: 'دستگاه در حالت شبیه‌ساز آماده‌به‌کار شد (برای سخت‌افزار واقعی از Chrome یا Edge استفاده نمایید).'
      };
    }

    try {
      this.addLog('info', 'درخواست انتخاب پورت سریال USB مودم ZyXEL 3G از کاربر...');
      const serial = (navigator as any).serial;
      const port = await serial.requestPort();
      
      // Open serial port with complete flow and buffer controls
      await port.open({ 
        baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        flowControl: 'none',
        bufferSize: 8192
      });

      this.serialPort = port;
      this.status.isConnected = true;
      this.status.isSimulated = false;
      this.status.baudRate = baudRate;
      this.status.portName = `پورت سریال USB (${baudRate} bps)`;
      this.addLog('info', `پورت با موفقیت باز شد (BaudRate: ${baudRate})`);

      // Critical for ZyXEL 3G & USB Dongles: Assert DTR (Data Terminal Ready) and RTS (Request To Send)
      try {
        await port.setSignals({ dataTerminalReady: true, requestToSend: true });
        this.addLog('info', 'سیگنال‌های DTR/RTS برای بیدارباش مودم با موفقیت فعال شد.');
      } catch (sigErr) {
        console.warn('Set signals warning:', sigErr);
      }

      // Start serial reader stream
      this.startReading();

      // Clear mock messages now that a real hardware modem is connected
      if (this.receivedMessages.some(m => m.sender === '09121234567')) {
        this.receivedMessages = [];
        this.status.storageUsed = 0;
      }

      // Test AT ping to confirm this port is the AT Command interface (and not the PPP network port)
      this.addLog('info', 'در حال آزمایش پاسخگویی پورت با ارسال فرمان AT...');
      const atPing = await this.executeAtCommand('AT', 2500);

      if (atPing.includes('OK')) {
        this.status.atResponsive = true;
        this.addLog('info', 'پاسخ OK دریافت شد: پورت انتخاب شده رابط فعال AT مودم است.');
      } else {
        this.status.atResponsive = false;
        this.addLog('error', 'هشدار: پورت باز شد ولی پاسخ AT دریافت نشد. نکته: مودم‌های ZyXEL 3G معمولاً ۲ یا ۳ پورت در ویندوز ایجاد می‌کنند (پورت مودم، پورت Application/UI). اگر ارسال/دریافت کار نکرد، اتصال را قطع کرده و پورت دیگر را انتخاب نمایید.');
      }

      // Run full hardware setup
      await this.runInitialHardwareSetup();

      this.notifyStatus();
      return { 
        success: true, 
        message: this.status.atResponsive 
          ? 'مودم ZyXEL 3G متصل شد و پاسخ فرامین AT با موفقیت تایید گردید.'
          : 'مودم متصل شد اما پاسخی به AT نداد. اگر پیام ارسال نشد، پورت دیگر مودم را انتخاب کنید.'
      };
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
      this.status.atResponsive = true;
      this.addLog('info', 'مودم GSM در حالت شبیه‌ساز سخت‌افزاری فعال شد.');
    } else {
      this.status.isSimulated = false;
      this.status.isConnected = false;
      this.status.portName = 'بدون اتصال فیزیکی';
      this.addLog('info', 'حالت شبیه‌ساز غیرفعال شد. لطفاً مودم را با کابل USB متصل فرمایید.');
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
    this.serialPort.readable.pipeTo(textDecoder.writable).catch((e: any) => {
      console.warn('Readable pipe closed or aborted:', e);
    });
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

    // Check for unsolicited result codes for new incoming SMS (+CMTI: "SM", 4 or +CMTI: "ME", 4)
    if (chunk.includes('+CMTI:')) {
      const match = chunk.match(/\+CMTI:\s*"([^"]*)",\s*(\d+)/i);
      if (match) {
        const storage = (match[1].toUpperCase() || 'SM') as 'SM' | 'ME' | 'MT';
        const idx = parseInt(match[2], 10);
        this.addLog('info', `پیامک جدید در حافظه ${storage} ردیف ${idx} مودم دریافت شد. در حال بازخوانی خودکار...`);
        this.readSingleMessage(idx, storage);
      }
    }
  }

  // Send AT command to device and wait for response
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

    // Standard Hayes AT commands end with \r. If message body terminates in \x1A (Ctrl+Z), do NOT append \r.
    const isCtrlZ = item.command.endsWith('\x1A');
    const formattedCmd = isCtrlZ 
      ? item.command 
      : (item.command.endsWith('\r') || item.command.endsWith('\r\n') ? item.command : item.command + '\r');

    try {
      if (!this.writer && this.serialPort?.writable) {
        this.writer = this.serialPort.writable.getWriter();
      }
      if (!this.writer) {
        throw new Error('پورت سریال برای نوشتن باز نیست');
      }

      this.readBuffer = '';
      await this.writer.write(encoder.encode(formattedCmd));

      const startTime = Date.now();
      const checkResponse = () => {
        const buf = this.readBuffer;
        
        // Check for prompt '>' (waiting for body)
        if (buf.includes('> ') || buf.endsWith('>') || buf.includes('\r\n>')) {
          const res = this.readBuffer;
          this.isProcessingCommand = false;
          item.resolve(res);
          this.processNextCommand();
          return;
        }

        // Check for completion or error
        if (
          buf.includes('OK\r') || 
          buf.includes('OK\n') || 
          buf.endsWith('OK') || 
          buf.includes('ERROR') || 
          buf.includes('+CMS ERROR') || 
          buf.includes('+CME ERROR')
        ) {
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

        setTimeout(checkResponse, 40);
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
        if (cleanCmd === 'AT' || cleanCmd === 'ATZ' || cleanCmd === 'ATE0') {
          resp = 'OK';
        } else if (cleanCmd.startsWith('AT+CSQ')) {
          resp = '+CSQ: 27,99\r\nOK';
          this.status.signalStrength = 87;
          this.status.csqRaw = 27;
        } else if (cleanCmd.startsWith('AT+COPS?')) {
          resp = '+COPS: 0,0,"IR-MCI",2\r\nOK';
          this.status.operator = 'همراه اول (IR-MCI)';
        } else if (cleanCmd.startsWith('AT+CGMI')) {
          resp = 'ZyXEL Communications Corp.\r\nOK';
          this.status.manufacturer = 'ZyXEL Communications Corp.';
        } else if (cleanCmd.startsWith('AT+CGMM')) {
          resp = 'ZyXEL 3G Modem (MAX218M/HSDPA)\r\nOK';
          this.status.model = 'ZyXEL 3G USB Modem';
        } else if (cleanCmd.startsWith('AT+CGSN')) {
          resp = '863920194827103\r\nOK';
          this.status.imei = '863920194827103';
        } else if (cleanCmd.startsWith('AT+CPIN?')) {
          resp = '+CPIN: READY\r\nOK';
          this.status.simStatus = 'ready';
        } else if (cleanCmd.startsWith('AT+CSCA?')) {
          resp = '+CSCA: "+9891100500",145\r\nOK';
          this.status.smscNumber = '+9891100500';
        } else if (cleanCmd.startsWith('AT+CPMS?')) {
          resp = '+CPMS: "SM",3,30,"SM",3,30,"SM",3,30\r\nOK';
          this.status.storageUsed = 3;
          this.status.storageTotal = 30;
        } else if (cleanCmd.startsWith('AT+CPMS=')) {
          resp = '+CPMS: 3,30,3,30,3,30\r\nOK';
        } else if (cleanCmd.startsWith('AT+CMGF=')) {
          resp = 'OK';
        } else if (cleanCmd.startsWith('AT+CMGS=')) {
          resp = '> ';
        } else if (cmd.endsWith('\x1A')) {
          resp = '+CMGS: ' + Math.floor(Math.random() * 100 + 1) + '\r\nOK';
        } else if (cleanCmd.startsWith('AT+CMGL=')) {
          resp = `+CMGL: 1,"REC READ","09121234567",,"1403/04/18 10:24"\r\nسلام و احترام، وجه فاکتور شماره ۱۰۴۲ واریز شد.\r\n+CMGL: 2,"REC UNREAD","09359876543",,"1403/04/18 11:45"\r\nدرود، پیش‌فاکتور اقلام سفارشی دیروز را ارسال کنید.\r\nOK`;
        }

        this.addLog('received', resp);
        this.notifyStatus();
        resolve(resp);
      }, 120);
    });
  }

  // Initial queries to get signal, operator, model, SIM storage, and SMSC
  public async runInitialHardwareSetup() {
    try {
      this.addLog('info', 'بررسی اولیه مودم ZyXEL 3G و راه‌اندازی فرامین پایه‌ای...');
      await this.executeAtCommand('AT');
      await this.executeAtCommand('ATZ');
      await this.executeAtCommand('ATE0'); // Echo off
      
      // SIM status
      const cpinRes = await this.executeAtCommand('AT+CPIN?');
      if (cpinRes.includes('READY')) {
        this.status.simStatus = 'ready';
      } else if (cpinRes.includes('SIM PIN')) {
        this.status.simStatus = 'pin_required';
      } else if (cpinRes.includes('ERROR')) {
        this.status.simStatus = 'not_inserted';
      }
      
      // Query Manufacturer & Model
      const cgmiRes = await this.executeAtCommand('AT+CGMI');
      if (cgmiRes.toUpperCase().includes('ZYXEL')) {
        this.status.manufacturer = 'ZyXEL Communications Corp.';
        this.status.deviceProfile = 'zyxel_3g';
      }
      const cgmmRes = await this.executeAtCommand('AT+CGMM');
      if (cgmmRes.toUpperCase().includes('ZYXEL') || this.status.deviceProfile === 'zyxel_3g') {
        this.status.model = 'ZyXEL 3G USB Modem';
      }

      // Query Signal
      const csqRes = await this.executeAtCommand('AT+CSQ');
      this.parseCsq(csqRes);

      // Query Operator
      const copsRes = await this.executeAtCommand('AT+COPS?');
      this.parseCops(copsRes);

      // Query IMEI
      const imeiRes = await this.executeAtCommand('AT+CGSN');
      this.parseImei(imeiRes);

      // Query SMSC Center Number
      const cscaRes = await this.executeAtCommand('AT+CSCA?');
      const cscaMatch = cscaRes.match(/\+CSCA:\s*"([^"]+)"/);
      if (cscaMatch && cscaMatch[1]) {
        this.status.smscNumber = cscaMatch[1];
        this.addLog('info', `شماره مرکز خدمات پیامک (SMSC): ${this.status.smscNumber}`);
      }

      // Query SMS Storage Capacity
      const cpmsRes = await this.executeAtCommand('AT+CPMS?');
      this.parseCpms(cpmsRes);

      // Enable real-time SMS arrival notifications
      await this.executeAtCommand('AT+CNMI=2,1,0,0,0');

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

  private parseCpms(res: string) {
    const match = res.match(/\+CPMS:\s*(?:"[A-Z]+",)?\s*(\d+),\s*(\d+)/);
    if (match) {
      this.status.storageUsed = parseInt(match[1], 10);
      this.status.storageTotal = parseInt(match[2], 10);
    }
  }

  // --- SENDING SMS VIA USB GSM MODEM ---
  // Implements two-phase execution (Command -> Wait for '>' -> Body + Ctrl+Z)
  // Supports both universal GSM PDU Mode and Text Mode with automatic fallback
  public async sendSms(
    to: string, 
    messageText: string, 
    modeOverride?: 'auto' | 'pdu' | 'text'
  ): Promise<GsmSentResult> {
    if (!this.status.isConnected) {
      return { success: false, error: 'دستگاه مودم GSM متصل نیست.' };
    }

    if (!to || !to.trim()) {
      return { success: false, error: 'شماره گیرنده وارد نشده است.' };
    }

    if (!messageText || !messageText.trim()) {
      return { success: false, error: 'متن پیامک نمی‌تواند خالی باشد.' };
    }

    const cleanNumber = to.trim().replace(/\s+/g, '');
    const parts = Math.ceil(messageText.length / 70) || 1;
    const mode = modeOverride || this.status.preferredSmsMode || 'auto';

    try {
      this.addLog('info', `در حال شروع فرایند ارسال پیامک به ${cleanNumber}...`);

      if (this.status.isSimulated || !this.serialPort) {
        await new Promise(r => setTimeout(r, 500));
        const msgId = `GSM-${Date.now().toString(36).toUpperCase()}`;
        this.addLog('received', `+CMGS: ${Math.floor(Math.random() * 50 + 1)}\r\nOK`);
        this.addLog('info', `پیامک در حالت شبیه‌ساز با موفقیت ارسال شد (شناسه: ${msgId})`);

        const result: GsmSentResult = {
          success: true,
          messageId: msgId,
          recipient: cleanNumber,
          timestamp: new Date().toLocaleTimeString('fa-IR'),
          partsCount: parts,
          modeUsed: 'simulated'
        };

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gsm_message_sent', { detail: result }));
        }
        return result;
      }

      // Hardware Transmission:
      if (mode === 'pdu' || mode === 'auto') {
        const pduResult = await this.sendSmsViaPdu(cleanNumber, messageText);
        if (pduResult.success) return pduResult;
        
        if (mode === 'auto') {
          this.addLog('info', 'ارسال در حالت PDU با خطا مواجه شد. در حال تلاش مجدد در حالت متنی (Text Mode)...');
          const textResult = await this.sendSmsViaText(cleanNumber, messageText);
          if (textResult.success) return textResult;
          return {
            success: false,
            error: `ارسال با هر دو روش PDU و Text با خطا مواجه شد. شرح: ${translateCmsError(pduResult.error || textResult.error || '')}`
          };
        }
        return pduResult;
      } else {
        return await this.sendSmsViaText(cleanNumber, messageText);
      }

    } catch (err: any) {
      this.addLog('error', `خطا در ارسال پیامک: ${err.message || err}`);
      return {
        success: false,
        error: translateCmsError(err.message || 'خطای ناشناخته در ارسال با مودم GSM')
      };
    }
  }

  // PDU Mode Sending (Universal 3GPP GSM 03.40 standard - handles all Persian/Unicode text natively)
  private async sendSmsViaPdu(cleanNumber: string, messageText: string): Promise<GsmSentResult> {
    try {
      this.addLog('info', 'تنظیم مودم روی حالت استاندارد جهانی PDU (AT+CMGF=0)...');
      await this.executeAtCommand('AT+CMGF=0', 3000);

      const pdu = encodeSmsSubmitPdu(cleanNumber, messageText);
      this.addLog('info', `PDU آماده شد. طول داده: ${pdu.length} بایت. ارسال فرمان AT+CMGS=${pdu.length}...`);

      // Phase 1: Issue AT+CMGS=<length> and wait for prompt '>'
      const promptResp = await this.executeAtCommand(`AT+CMGS=${pdu.length}`, 8000);
      
      if (!promptResp.includes('>') && !promptResp.includes('> ')) {
        throw new Error(`مودم پس از AT+CMGS پرامپت دریافت متن (>) را بازنگرداند. پاسخ: ${promptResp}`);
      }

      // Phase 2: Write PDU Hex + Ctrl+Z (0x1A)
      this.addLog('info', 'پرامپت > دریافت شد. ارسال بسته PDU و خاتمه با Ctrl+Z...');
      const sendResp = await this.executeAtCommand(`${pdu.pduHex}\x1A`, 25000);

      if (sendResp.includes('OK') || sendResp.includes('+CMGS:')) {
        const msgIdMatch = sendResp.match(/\+CMGS:\s*(\d+)/);
        const msgId = msgIdMatch ? `PDU-${msgIdMatch[1]}` : `GSM-${Date.now().toString(36).toUpperCase()}`;
        this.addLog('info', `پیامک با موفقیت از طریق پروتکل PDU به دکل مخابراتی ارسال شد (کد مرجع: ${msgId}).`);
        
        const result: GsmSentResult = {
          success: true,
          messageId: msgId,
          recipient: cleanNumber,
          timestamp: new Date().toLocaleTimeString('fa-IR'),
          partsCount: Math.ceil(messageText.length / 70) || 1,
          modeUsed: 'pdu',
          rawResponse: sendResp
        };

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gsm_message_sent', { detail: result }));
        }
        return result;
      } else {
        throw new Error(translateCmsError(sendResp));
      }
    } catch (err: any) {
      this.addLog('error', `ارسال در حالت PDU ناموفق بود: ${err.message || err}`);
      return {
        success: false,
        error: translateCmsError(err.message || 'خطا در حالت PDU')
      };
    }
  }

  // Text Mode Sending (AT+CMGF=1 with AT+CSMP UCS2 configuration)
  private async sendSmsViaText(cleanNumber: string, messageText: string): Promise<GsmSentResult> {
    try {
      this.addLog('info', 'تنظیم مودم روی حالت متنی (AT+CMGF=1)...');
      await this.executeAtCommand('AT+CMGF=1', 3000);

      const hasUnicode = /[^\u0000-\u007F]/.test(messageText);

      if (hasUnicode) {
        try {
          await this.executeAtCommand('AT+CSCS="UCS2"', 2000);
          // Set SMS Text Mode Parameters: 17 = SMS-SUBMIT with validity, 167 = 24h, 0 = PID, 8 = UCS2 16-bit
          await this.executeAtCommand('AT+CSMP=17,167,0,8', 2000);
        } catch (e) {
          console.warn('Could not set UCS2 charset:', e);
        }
      } else {
        try {
          await this.executeAtCommand('AT+CSCS="GSM"', 2000);
          await this.executeAtCommand('AT+CSMP=17,167,0,0', 2000);
        } catch (e) {
          console.warn('Could not set GSM charset:', e);
        }
      }

      // Phase 1: Issue AT+CMGS="phoneNumber"
      const cmgsCmd = `AT+CMGS="${cleanNumber}"`;
      this.addLog('info', `ارسال فرمان ${cmgsCmd} و انتظار برای پرامپت > ...`);
      const promptResp = await this.executeAtCommand(cmgsCmd, 8000);

      if (!promptResp.includes('>') && !promptResp.includes('> ')) {
        throw new Error(`مودم در حالت متنی پرامپت > را ارسال نکرد. پاسخ: ${promptResp}`);
      }

      // Phase 2: Send Body + Ctrl+Z
      const bodyToSend = hasUnicode ? textToHexUcs2(messageText) : messageText;
      this.addLog('info', 'ارسال بدنه پیامک و پایان با Ctrl+Z...');
      const sendResp = await this.executeAtCommand(`${bodyToSend}\x1A`, 25000);

      if (sendResp.includes('OK') || sendResp.includes('+CMGS:')) {
        const msgIdMatch = sendResp.match(/\+CMGS:\s*(\d+)/);
        const msgId = msgIdMatch ? `TXT-${msgIdMatch[1]}` : `GSM-${Date.now().toString(36).toUpperCase()}`;
        this.addLog('info', `پیامک با موفقیت در حالت متنی ارسال شد (کد مرجع: ${msgId}).`);
        
        const result: GsmSentResult = {
          success: true,
          messageId: msgId,
          recipient: cleanNumber,
          timestamp: new Date().toLocaleTimeString('fa-IR'),
          partsCount: Math.ceil(messageText.length / 70) || 1,
          modeUsed: 'text',
          rawResponse: sendResp
        };

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('gsm_message_sent', { detail: result }));
        }
        return result;
      } else {
        throw new Error(translateCmsError(sendResp));
      }
    } catch (err: any) {
      this.addLog('error', `ارسال در حالت متنی ناموفق بود: ${err.message || err}`);
      return {
        success: false,
        error: translateCmsError(err.message || 'خطا در حالت متنی')
      };
    }
  }

  // --- RECEIVING SMS VIA USB GSM MODEM ---
  // Queries both SIM card ("SM") and device internal memory ("ME")
  // Supports both Text Mode and PDU Mode decoding
  public async fetchReceivedMessages(forceStorage?: 'SM' | 'ME' | 'ALL'): Promise<GsmReceivedMessage[]> {
    this.addLog('info', 'در حال بازخوانی پیامک‌های دریافتی از سیم‌کارت و حافظه مودم ZyXEL...');

    if (this.status.isSimulated || !this.serialPort) {
      await new Promise(r => setTimeout(r, 400));
      this.addLog('info', `تعداد ${this.receivedMessages.length} پیامک در حافظه شبیه‌ساز موجود است.`);
      return [...this.receivedMessages];
    }

    const storageToQuery: ('SM' | 'ME')[] = 
      forceStorage === 'SM' ? ['SM'] :
      forceStorage === 'ME' ? ['ME'] :
      (this.status.activeStorage === 'SM' ? ['SM'] :
       this.status.activeStorage === 'ME' ? ['ME'] :
       ['SM', 'ME']);

    const collectedMessages: GsmReceivedMessage[] = [];

    try {
      // First update CPMS storage counts
      const cpmsInfo = await this.executeAtCommand('AT+CPMS?');
      this.parseCpms(cpmsInfo);

      for (const mem of storageToQuery) {
        try {
          this.addLog('info', `انتخاب حافظه ذخیره‌سازی «${mem}» (AT+CPMS="${mem}","${mem}","${mem}")...`);
          await this.executeAtCommand(`AT+CPMS="${mem}","${mem}","${mem}"`);

          // Method 1: Try Text Mode reading
          await this.executeAtCommand('AT+CMGF=1');
          await this.executeAtCommand('AT+CSCS="GSM"');
          const rawText = await this.executeAtCommand('AT+CMGL="ALL"', 8000);
          
          let parsed = this.parseCmglTextResponse(rawText, mem);
          
          // Method 2: If Text Mode didn't return messages, try PDU mode reading
          if (parsed.length === 0) {
            await this.executeAtCommand('AT+CMGF=0');
            const rawPdu = await this.executeAtCommand('AT+CMGL=4', 8000); // 4 = ALL in PDU mode
            parsed = this.parseCmglPduResponse(rawPdu, mem);
          }

          collectedMessages.push(...parsed);
        } catch (memErr) {
          console.warn(`Error reading from storage ${mem}:`, memErr);
        }
      }

      // Deduplicate messages by sender + timestamp + text
      const seen = new Set<string>();
      const uniqueMessages: GsmReceivedMessage[] = [];
      for (const m of collectedMessages) {
        const key = `${m.sender}-${m.timestamp}-${m.text.slice(0, 20)}`;
        if (!seen.has(key)) {
          seen.add(key);
          uniqueMessages.push(m);
        }
      }

      this.receivedMessages = uniqueMessages;
      this.status.storageUsed = uniqueMessages.length;
      this.persistData();
      this.notifyStatus();

      this.addLog('info', `تعداد ${this.receivedMessages.length} پیامک از حافظه فیزیکی مودم بازخوانی گردید.`);
      return [...this.receivedMessages];
    } catch (err: any) {
      this.addLog('error', `خطا در بازخوانی پیامک‌ها: ${err.message || err}`);
      return [...this.receivedMessages];
    }
  }

  // Parse Text Mode CMGL response
  private parseCmglTextResponse(raw: string, storage: 'SM' | 'ME' | 'MT'): GsmReceivedMessage[] {
    const list: GsmReceivedMessage[] = [];
    const lines = raw.split(/\r?\n/);
    let currentMsg: Partial<GsmReceivedMessage> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('+CMGL:')) {
        // Formats:
        // +CMGL: 1,"REC READ","09121234567",,"24/09/20,10:30:00+14"
        // +CMGL: 1,"REC UNREAD","+989121234567","","24/09/20,10:30:00+14"
        // +CMGL: 1,0,"",24 (if PDU)
        const match = line.match(/\+CMGL:\s*(\d+),\s*"([^"]*)",\s*"([^"]*)"(?:,[^,]*)?(?:,\s*"([^"]*)")?/);
        if (match) {
          const index = parseInt(match[1], 10);
          const status = match[2].toUpperCase().includes('UNREAD') ? 'unread' : 'read';
          const sender = match[3];
          const timestamp = match[4] || new Date().toLocaleString('fa-IR');

          currentMsg = {
            index,
            status,
            sender,
            timestamp,
            storage,
            text: ''
          };
        }
      } else if (currentMsg && line && !line.startsWith('OK') && !line.startsWith('ERROR')) {
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

  // Parse PDU Mode CMGL response
  private parseCmglPduResponse(raw: string, storage: 'SM' | 'ME' | 'MT'): GsmReceivedMessage[] {
    const list: GsmReceivedMessage[] = [];
    const lines = raw.split(/\r?\n/);
    let currentIndex: number | null = null;
    let currentStatus: 'read' | 'unread' = 'read';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.startsWith('+CMGL:')) {
        // e.g. +CMGL: 1, 0, , 24
        const match = line.match(/\+CMGL:\s*(\d+),\s*(\d+)/);
        if (match) {
          currentIndex = parseInt(match[1], 10);
          currentStatus = match[2] === '0' ? 'unread' : 'read';
        }
      } else if (currentIndex !== null && line.length > 20 && !line.startsWith('OK') && !line.startsWith('ERROR')) {
        const decoded = decodeSmsDeliverPdu(line);
        if (decoded) {
          list.push({
            index: currentIndex,
            sender: decoded.sender,
            text: decoded.text,
            timestamp: decoded.timestamp,
            status: currentStatus,
            storage,
            raw: line
          });
        }
        currentIndex = null;
      }
    }

    return list;
  }

  // Read a single message by index
  public async readSingleMessage(index: number, storage: 'SM' | 'ME' | 'MT' = 'SM'): Promise<GsmReceivedMessage | null> {
    try {
      if (this.serialPort) {
        await this.executeAtCommand(`AT+CPMS="${storage}","${storage}","${storage}"`);
        const raw = await this.executeAtCommand(`AT+CMGR=${index}`, 4000);
        const parsed = this.parseCmglTextResponse(`+CMGL: ${index},` + raw, storage);
        if (parsed[0]) {
          this.receivedMessages.unshift(parsed[0]);
          this.status.storageUsed = this.receivedMessages.length;
          this.persistData();
          this.notifyStatus();
          this.messageListeners.forEach(cb => cb(parsed[0]));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('gsm_message_received', { detail: parsed[0] }));
          }
          return parsed[0];
        }
      }
    } catch (e) {
      console.warn('Error reading single message:', e);
    }
    return null;
  }

  public async deleteReceivedMessage(index: number, storage: 'SM' | 'ME' | 'MT' = 'SM'): Promise<boolean> {
    try {
      this.addLog('sent', `AT+CMGD=${index}`);
      if (!this.status.isSimulated && this.serialPort) {
        await this.executeAtCommand(`AT+CPMS="${storage}","${storage}","${storage}"`);
        await this.executeAtCommand(`AT+CMGD=${index}`);
      }
      this.receivedMessages = this.receivedMessages.filter(m => m.index !== index);
      this.status.storageUsed = this.receivedMessages.length;
      this.persistData();
      this.notifyStatus();
      this.addLog('info', `پیامک ردیف ${index} از سیم‌کارت حذف شد.`);
      return true;
    } catch (err: any) {
      this.addLog('error', `خطا در حذف پیامک: ${err.message || err}`);
      return false;
    }
  }

  // Hardware Diagnostic test: tests serial, AT responsiveness, SIM, signal, SMSC, and storage step-by-step
  public async runComprehensiveDiagnostics(): Promise<DiagnosticStepResult[]> {
    const results: DiagnosticStepResult[] = [];

    // Step 1: Serial Port connection & DTR/RTS
    results.push({
      step: 1,
      title: 'ارتباط فیزیکی پورت سریال USB و سیگنال‌های DTR/RTS',
      command: 'Port Status',
      status: this.status.isConnected ? 'success' : 'error',
      rawResponse: this.status.portName,
      detail: this.status.isConnected 
        ? `پورت متصل است (${this.status.baudRate} bps). سیگنال‌های کنترلی فعال شدند.`
        : 'پورت متصل نیست. لطفاً دکمه «اتصال پورت USB» را کلیک فرمایید.',
      recommendation: !this.status.isConnected ? 'مودم را متصل کنید' : undefined
    });

    if (!this.status.isConnected) {
      return results;
    }

    // Step 2: AT Ping
    try {
      const atRes = await this.executeAtCommand('AT', 2500);
      const ok = atRes.includes('OK');
      results.push({
        step: 2,
        title: 'آزمون پاسخگویی به فرامین پایه AT (AT Ping)',
        command: 'AT',
        status: ok ? 'success' : 'error',
        rawResponse: atRes.trim(),
        detail: ok ? 'مودم به فرامین AT با موفقیت پاسخ OK داد.' : 'پورت باز است ولی مودم به AT پاسخ نداد.',
        recommendation: !ok ? 'توجه: مودم‌های 3G چند پورت دارند. لطفاً اتصال را قطع کرده و پورت دیگر مودم در لیست را انتخاب کنید.' : undefined
      });
    } catch (e: any) {
      results.push({
        step: 2,
        title: 'آزمون پاسخگویی به فرامین پایه AT',
        command: 'AT',
        status: 'error',
        rawResponse: e.message,
        detail: 'خطا در برقراری ارتباط با مودم',
        recommendation: 'پورت دیگر لیست را انتخاب فرمایید'
      });
    }

    // Step 3: Manufacturer & Model
    try {
      const modelRes = await this.executeAtCommand('AT+CGMM', 2500);
      results.push({
        step: 3,
        title: 'شناسایی مدل و سخت‌افزار مودم',
        command: 'AT+CGMM',
        status: modelRes.includes('OK') ? 'success' : 'warning',
        rawResponse: modelRes.trim(),
        detail: `مدل شناسایی شده: ${this.status.model || modelRes.trim()}`
      });
    } catch (e: any) {
      results.push({
        step: 3,
        title: 'شناسایی مدل و سخت‌افزار مودم',
        command: 'AT+CGMM',
        status: 'warning',
        detail: 'اطلاعات مدل بازخوانی نشد اما ارتباط برقرار است.'
      });
    }

    // Step 4: SIM Card State (AT+CPIN?)
    try {
      const cpinRes = await this.executeAtCommand('AT+CPIN?', 2500);
      const isReady = cpinRes.includes('READY');
      results.push({
        step: 4,
        title: 'وضعیت چیپ سیم‌کارت (SIM Status)',
        command: 'AT+CPIN?',
        status: isReady ? 'success' : 'error',
        rawResponse: cpinRes.trim(),
        detail: isReady 
          ? 'سیم‌کارت آماده‌به‌کار (Ready) است و نیاز به پین ندارد.'
          : cpinRes.includes('SIM PIN') ? 'سیم‌کارت نیاز به ورود کد PIN دارد.' : 'سیم‌کارت شناسایی نشد.',
        recommendation: !isReady ? 'سیم‌کارت را بررسی کرده یا قفل PIN را از طریق گوشی غیرفعال کنید.' : undefined
      });
    } catch (e: any) {
      results.push({
        step: 4,
        title: 'وضعیت چیپ سیم‌کارت',
        command: 'AT+CPIN?',
        status: 'error',
        detail: 'خطا در استعلام سیم‌کارت'
      });
    }

    // Step 5: Signal Strength & Operator
    try {
      const csqRes = await this.executeAtCommand('AT+CSQ', 2500);
      const copsRes = await this.executeAtCommand('AT+COPS?', 2500);
      const csqMatch = csqRes.match(/\+CSQ:\s*(\d+)/);
      const csqVal = csqMatch ? parseInt(csqMatch[1], 10) : 0;
      const isGoodSignal = csqVal >= 10 && csqVal <= 31;
      
      results.push({
        step: 5,
        title: 'کیفیت سیگنال آنتن 3G و شناسایی اپراتور',
        command: 'AT+CSQ ; AT+COPS?',
        status: isGoodSignal ? 'success' : 'warning',
        rawResponse: `${csqRes.trim()} | ${copsRes.trim()}`,
        detail: `قدرت سیگنال: ${csqVal}/31 (${this.status.signalStrength}%) | اپراتور: ${this.status.operator}`,
        recommendation: csqVal < 10 ? 'آنتن‌دهی در محل استقرار مودم ضعیف است. مودم را با کابل رابط نزدیک پنجره قرار دهید.' : undefined
      });
    } catch (e: any) {
      results.push({
        step: 5,
        title: 'کیفیت سیگنال آنتن 3G',
        command: 'AT+CSQ',
        status: 'warning',
        detail: 'خطا در استعلام سیگنال'
      });
    }

    // Step 6: SMS Center (SMSC)
    try {
      const cscaRes = await this.executeAtCommand('AT+CSCA?', 2500);
      const hasSmsc = cscaRes.includes('+CSCA:');
      results.push({
        step: 6,
        title: 'شماره مرکز خدمات پیامک مخابرات (SMSC)',
        command: 'AT+CSCA?',
        status: hasSmsc ? 'success' : 'warning',
        rawResponse: cscaRes.trim(),
        detail: hasSmsc ? `شماره مرکز پیامک: ${this.status.smscNumber || cscaRes.trim()}` : 'مرکز پیامک شناسایی نشد.',
        recommendation: !hasSmsc ? 'شماره مرکز پیامک باید از سیم‌کارت خوانده شود.' : undefined
      });
    } catch (e: any) {
      results.push({
        step: 6,
        title: 'شماره مرکز خدمات پیامک',
        command: 'AT+CSCA?',
        status: 'warning',
        detail: 'استعلام پیامک سنتر با هشدار مواجه شد.'
      });
    }

    // Step 7: Storage Capability & CPMS
    try {
      const cpmsRes = await this.executeAtCommand('AT+CPMS?', 2500);
      results.push({
        step: 7,
        title: 'فضای ذخیره‌سازی پیامک‌ها در سیم‌کارت و حافظه مودم',
        command: 'AT+CPMS?',
        status: cpmsRes.includes('+CPMS:') ? 'success' : 'warning',
        rawResponse: cpmsRes.trim(),
        detail: `ظرفیت پیامک: ${this.status.storageUsed} پیام از ظرفیت ${this.status.storageTotal}`
      });
    } catch (e: any) {
      results.push({
        step: 7,
        title: 'فضای ذخیره‌سازی پیامک‌ها',
        command: 'AT+CPMS?',
        status: 'warning',
        detail: 'اطلاعات حافظه در دسترس نیست.'
      });
    }

    return results;
  }

  // Add simulated incoming message for testing reception
  public simulateIncomingMessage(sender: string, text: string) {
    const newMsg: GsmReceivedMessage = {
      index: this.receivedMessages.length + 1,
      sender: sender || '09123456789',
      text: text || 'پیامک تستی دریافتی از طریق مودم GSM',
      timestamp: new Date().toLocaleTimeString('fa-IR'),
      status: 'unread',
      storage: 'SM'
    };
    this.receivedMessages.unshift(newMsg);
    this.status.storageUsed = this.receivedMessages.length;
    this.persistData();
    this.notifyStatus();
    this.addLog('info', `پیامک ورودی جدید از ${newMsg.sender} در سیستم ثبت گردید.`);
    this.messageListeners.forEach(cb => cb(newMsg));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('gsm_message_received', { detail: newMsg }));
    }
    return newMsg;
  }
}

export const gsmUsbService = new GsmUsbService();

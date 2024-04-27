export declare enum ADDRESS_MODE {
    bound = 0,//Use one or more bound nodes/endpoints, with acknowledgements
    group = 1,//Use a pre-defined group address, with acknowledgements
    short = 2,//Use a 16-bit network address, with acknowledgements
    ieee = 3,//Use a 64-bit IEEE/MAC address, with acknowledgements
    broadcast = 4,//Perform a broadcast
    no_transmit = 5,//Do not transmit
    bound_no_ack = 6,//Perform a bound transmission, with no acknowledgements
    short_no_ack = 7,//Perform a transmission using a 16-bit network address, with no acknowledgements
    ieee_no_ack = 8,//Perform a transmission using a 64-bit IEEE/MAC address, with no acknowledgements
    bound_non_blocking = 9,//Perform a non-blocking bound transmission, with acknowledgements
    bound_non_blocking_no_ack = 10
}
export declare enum DEVICE_TYPE {
    coordinator = 0,
    router = 1,
    legacy_router = 2
}
export declare enum BOOLEAN {
    false = 0,
    true = 1
}
export declare enum LOG_LEVEL {
    "EMERG" = 0,
    "ALERT" = 1,
    "CRIT " = 2,
    "ERROR" = 3,
    "WARN " = 4,
    "NOT  " = 5,
    "INFO " = 6,
    "DEBUG" = 7
}
export declare enum NODE_LOGICAL_TYPE {
    coordinator = 0,
    router = 1,
    end_device = 2
}
export declare enum STATUS {
    E_SL_MSG_STATUS_SUCCESS = 0,
    E_SL_MSG_STATUS_INCORRECT_PARAMETERS = 1,
    E_SL_MSG_STATUS_UNHANDLED_COMMAND = 2,
    E_SL_MSG_STATUS_BUSY = 3,
    E_SL_MSG_STATUS_STACK_ALREADY_STARTED = 4
}
export declare enum PERMIT_JOIN_STATUS {
    on = 1,// devices are allowed to join network
    off = 0
}
export declare enum NETWORK_JOIN_STATUS {
    joined_existing_network = 0,
    formed_new_network = 1,
    failed_128 = 128,//network join failed (error 0x80)
    failed_129 = 129,//network join failed (error 0x81)
    failed_130 = 130,//network join failed (error 0x82)
    failed_131 = 131,//network join failed (error 0x83)
    failed_132 = 132,//network join failed (error 0x84)
    failed_133 = 133,//network join failed (error 0x85)
    failed_134 = 134,//network join failed (error 0x86)
    failed_135 = 135,//network join failed (error 0x87)
    failed_136 = 136,//network join failed (error 0x88)
    failed_137 = 137,//network join failed (error 0x89)
    failed_138 = 138,//network join failed (error 0x8a)
    failed_139 = 139,//network join failed (error 0x8b)
    failed_140 = 140,//network join failed (error 0x8c)
    failed_141 = 141,//network join failed (error 0x8d)
    failed_142 = 142,//network join failed (error 0x8e)
    failed_143 = 143,//network join failed (error 0x8f)
    failed_144 = 144,//network join failed (error 0x90)
    failed_145 = 145,//network join failed (error 0x91)
    failed_146 = 146,//network join failed (error 0x92)
    failed_147 = 147,//network join failed (error 0x93)
    failed_148 = 148,//network join failed (error 0x94)
    failed_149 = 149,//network join failed (error 0x95)
    failed_150 = 150,//network join failed (error 0x96)
    failed_151 = 151,//network join failed (error 0x97)
    failed_152 = 152,//network join failed (error 0x98)
    failed_153 = 153,//network join failed (error 0x99)
    failed_154 = 154,//network join failed (error 0x9a)
    failed_155 = 155,//network join failed (error 0x9b)
    failed_156 = 156,//network join failed (error 0x9c)
    failed_157 = 157,//network join failed (error 0x9d)
    failed_158 = 158,//network join failed (error 0x9e)
    failed_159 = 159,//network join failed (error 0x9f)
    failed_160 = 160,//network join failed (error 0xa0)
    failed_161 = 161,//network join failed (error 0xa1)
    failed_162 = 162,//network join failed (error 0xa2)
    failed_163 = 163,//network join failed (error 0xa3)
    failed_164 = 164,//network join failed (error 0xa4)
    failed_165 = 165,//network join failed (error 0xa5)
    failed_166 = 166,//network join failed (error 0xa6)
    failed_167 = 167,//network join failed (error 0xa7)
    failed_168 = 168,//network join failed (error 0xa8)
    failed_169 = 169,//network join failed (error 0xa9)
    failed_170 = 170,//network join failed (error 0xaa)
    failed_171 = 171,//network join failed (error 0xab)
    failed_172 = 172,//network join failed (error 0xac)
    failed_173 = 173,//network join failed (error 0xad)
    failed_174 = 174,//network join failed (error 0xae)
    failed_175 = 175,//network join failed (error 0xaf)
    failed_176 = 176,//network join failed (error 0xb0)
    failed_177 = 177,//network join failed (error 0xb1)
    failed_178 = 178,//network join failed (error 0xb2)
    failed_179 = 179,//network join failed (error 0xb3)
    failed_180 = 180,//network join failed (error 0xb4)
    failed_181 = 181,//network join failed (error 0xb5)
    failed_182 = 182,//network join failed (error 0xb6)
    failed_183 = 183,//network join failed (error 0xb7)
    failed_184 = 184,//network join failed (error 0xb8)
    failed_185 = 185,//network join failed (error 0xb9)
    failed_186 = 186,//network join failed (error 0xba)
    failed_187 = 187,//network join failed (error 0xbb)
    failed_188 = 188,//network join failed (error 0xbc)
    failed_189 = 189,//network join failed (error 0xbd)
    failed_190 = 190,//network join failed (error 0xbe)
    failed_191 = 191,//network join failed (error 0xbf)
    failed_192 = 192,//network join failed (error 0xc0)
    failed_193 = 193,//network join failed (error 0xc1)
    failed_194 = 194,//network join failed (error 0xc2)
    failed_195 = 195,//network join failed (error 0xc3)
    failed_196 = 196,//network join failed (error 0xc4)
    failed_197 = 197,//network join failed (error 0xc5)
    failed_198 = 198,//network join failed (error 0xc6)
    failed_199 = 199,//network join failed (error 0xc7)
    failed_200 = 200,//network join failed (error 0xc8)
    failed_201 = 201,//network join failed (error 0xc9)
    failed_202 = 202,//network join failed (error 0xca)
    failed_203 = 203,//network join failed (error 0xcb)
    failed_204 = 204,//network join failed (error 0xcc)
    failed_205 = 205,//network join failed (error 0xcd)
    failed_206 = 206,//network join failed (error 0xce)
    failed_207 = 207,//network join failed (error 0xcf)
    failed_208 = 208,//network join failed (error 0xd0)
    failed_209 = 209,//network join failed (error 0xd1)
    failed_210 = 210,//network join failed (error 0xd2)
    failed_211 = 211,//network join failed (error 0xd3)
    failed_212 = 212,//network join failed (error 0xd4)
    failed_213 = 213,//network join failed (error 0xd5)
    failed_214 = 214,//network join failed (error 0xd6)
    failed_215 = 215,//network join failed (error 0xd7)
    failed_216 = 216,//network join failed (error 0xd8)
    failed_217 = 217,//network join failed (error 0xd9)
    failed_218 = 218,//network join failed (error 0xda)
    failed_219 = 219,//network join failed (error 0xdb)
    failed_220 = 220,//network join failed (error 0xdc)
    failed_221 = 221,//network join failed (error 0xdd)
    failed_222 = 222,//network join failed (error 0xde)
    failed_223 = 223,//network join failed (error 0xdf)
    failed_224 = 224,//network join failed (error 0xe0)
    failed_225 = 225,//network join failed (error 0xe1)
    failed_226 = 226,//network join failed (error 0xe2)
    failed_227 = 227,//network join failed (error 0xe3)
    failed_228 = 228,//network join failed (error 0xe4)
    failed_229 = 229,//network join failed (error 0xe5)
    failed_230 = 230,//network join failed (error 0xe6)
    failed_231 = 231,//network join failed (error 0xe7)
    failed_232 = 232,//network join failed (error 0xe8)
    failed_233 = 233,//network join failed (error 0xe9)
    failed_234 = 234,//network join failed (error 0xea)
    failed_235 = 235,//network join failed (error 0xeb)
    failed_236 = 236,//network join failed (error 0xec)
    failed_237 = 237,//network join failed (error 0xed)
    failed_238 = 238,//network join failed (error 0xee)
    failed_239 = 239,//network join failed (error 0xef)
    failed_240 = 240,//network join failed (error 0xf0)
    failed_241 = 241,//network join failed (error 0xf1)
    failed_242 = 242,//network join failed (error 0xf2)
    failed_243 = 243,//network join failed (error 0xf3)
    failed_244 = 244
}
export declare enum ON_OFF_STATUS {
    on = 1,
    off = 0
}
export declare enum RESTART_STATUS {
    startup = 0,
    nfn_start = 2,
    running = 6
}
export declare enum ZiGateCommandCode {
    GetNetworkState = 9,
    RawMode = 2,
    SetExtendedPANID = 32,
    SetChannelMask = 33,
    GetVersion = 16,
    Reset = 17,
    ErasePersistentData = 18,
    RemoveDevice = 38,
    PermitJoin = 73,
    RawAPSDataRequest = 1328,
    GetTimeServer = 23,
    SetTimeServer = 22,
    PermitJoinStatus = 20,
    GetDevicesList = 21,
    StartNetwork = 36,
    StartNetworkScan = 37,
    SetCertification = 25,
    Bind = 48,
    UnBind = 49,
    OnOff = 146,
    OnOffTimed = 147,
    ActiveEndpoint = 69,
    AttributeDiscovery = 320,
    AttributeRead = 256,
    AttributeWrite = 272,
    DescriptorComplex = 1329,
    NodeDescriptor = 66,
    PowerDescriptor = 68,
    SimpleDescriptor = 67,
    SetDeviceType = 35,
    IEEEAddress = 65,
    LED = 24,
    SetTXpower = 2054,
    ManagementLeaveRequest = 71,
    ManagementLQI = 78,
    SetSecurityStateKey = 34,
    AddGroup = 96
}
export declare enum ZiGateMessageCode {
    DeviceAnnounce = 77,
    Status = 32768,
    LOG = 32769,
    DataIndication = 32770,
    NodeClusterList = 32771,
    NodeAttributeList = 32772,
    NodeCommandIDList = 32773,
    SimpleDescriptorResponse = 32835,
    NetworkState = 32777,
    VersionList = 32784,
    APSDataACK = 32785,
    APSDataConfirm = 32786,
    APSDataConfirmFailed = 34562,
    NetworkJoined = 32804,
    LeaveIndication = 32840,
    RouterDiscoveryConfirm = 34561,
    PermitJoinStatus = 32788,
    GetTimeServer = 32791,
    ManagementLQIResponse = 32846,
    ManagementLeaveResponse = 32839,
    PDMEvent = 32821,
    PDMLoaded = 770,
    RestartNonFactoryNew = 32774,
    RestartFactoryNew = 32775,
    ExtendedStatusCallBack = 39321,
    AddGroupResponse = 32864
}
export type ZiGateObjectPayload = any;
export declare enum ZPSNwkKeyState {
    ZPS_ZDO_NO_NETWORK_KEY = 0,
    ZPS_ZDO_PRECONFIGURED_LINK_KEY = 1,
    ZPS_ZDO_DISTRIBUTED_LINK_KEY = 2,
    ZPS_ZDO_PRECONFIGURED_INSTALLATION_CODE = 3
}
export declare enum ZPSNwkKeyType {
    ZPS_APS_UNIQUE_LINK_KEY = 0,/*Initial key*/
    ZPS_APS_GLOBAL_LINK_KEY = 1
}
export declare enum PDMEventType {
    E_PDM_SYSTEM_EVENT_WEAR_COUNT_TRIGGER_VALUE_REACHED = 0,
    E_PDM_SYSTEM_EVENT_DESCRIPTOR_SAVE_FAILED = 1,
    E_PDM_SYSTEM_EVENT_PDM_NOT_ENOUGH_SPACE = 2,
    E_PDM_SYSTEM_EVENT_LARGEST_RECORD_FULL_SAVE_NO_LONGER_POSSIBLE = 3,
    E_PDM_SYSTEM_EVENT_SEGMENT_DATA_CHECKSUM_FAIL = 4,
    E_PDM_SYSTEM_EVENT_SEGMENT_SAVE_OK = 5,
    E_PDM_SYSTEM_EVENT_EEPROM_SEGMENT_HEADER_REPAIRED = 6,
    E_PDM_SYSTEM_EVENT_SYSTEM_INTERNAL_BUFFER_WEAR_COUNT_SWAP = 7,
    E_PDM_SYSTEM_EVENT_SYSTEM_DUPLICATE_FILE_SEGMENT_DETECTED = 8,
    E_PDM_SYSTEM_EVENT_SYSTEM_ERROR = 9,
    E_PDM_SYSTEM_EVENT_SEGMENT_PREWRITE = 10,
    E_PDM_SYSTEM_EVENT_SEGMENT_POSTWRITE = 11,
    E_PDM_SYSTEM_EVENT_SEQUENCE_DUPLICATE_DETECTED = 12,
    E_PDM_SYSTEM_EVENT_SEQUENCE_VERIFY_FAIL = 13,
    E_PDM_SYSTEM_EVENT_PDM_SMART_SAVE = 14,
    E_PDM_SYSTEM_EVENT_PDM_FULL_SAVE = 15
}
declare const coordinatorEndpoints: any;
export { coordinatorEndpoints };
//# sourceMappingURL=constants.d.ts.map
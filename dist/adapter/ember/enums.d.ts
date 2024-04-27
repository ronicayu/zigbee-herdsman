/** Status Defines */
export declare enum SLStatus {
    /** No error. */
    OK = 0,
    /** Generic error. */
    FAIL = 1,
    /** Generic invalid state error. */
    INVALID_STATE = 2,
    /** Module is not ready for requested operation. */
    NOT_READY = 3,
    /** Module is busy and cannot carry out requested operation. */
    BUSY = 4,
    /** Operation is in progress and not yet complete (pass or fail). */
    IN_PROGRESS = 5,
    /** Operation aborted. */
    ABORT = 6,
    /** Operation timed out. */
    TIMEOUT = 7,
    /** Operation not allowed per permissions. */
    PERMISSION = 8,
    /** Non-blocking operation would block. */
    WOULD_BLOCK = 9,
    /** Operation/module is Idle, cannot carry requested operation. */
    IDLE = 10,
    /** Operation cannot be done while construct is waiting. */
    IS_WAITING = 11,
    /** No task/construct waiting/pending for that action/event. */
    NONE_WAITING = 12,
    /** Operation cannot be done while construct is suspended. */
    SUSPENDED = 13,
    /** Feature not available due to software configuration. */
    NOT_AVAILABLE = 14,
    /** Feature not supported. */
    NOT_SUPPORTED = 15,
    /** Initialization failed. */
    INITIALIZATION = 16,
    /** Module has not been initialized. */
    NOT_INITIALIZED = 17,
    /** Module has already been initialized. */
    ALREADY_INITIALIZED = 18,
    /** Object/construct has been deleted. */
    DELETED = 19,
    /** Illegal call from ISR. */
    ISR = 20,
    /** Illegal call because network is up. */
    NETWORK_UP = 21,
    /** Illegal call because network is down. */
    NETWORK_DOWN = 22,
    /** Failure due to not being joined in a network. */
    NOT_JOINED = 23,
    /** Invalid operation as there are no beacons. */
    NO_BEACONS = 24,
    /** Generic allocation error. */
    ALLOCATION_FAILED = 25,
    /** No more resource available to perform the operation. */
    NO_MORE_RESOURCE = 26,
    /** Item/list/queue is empty. */
    EMPTY = 27,
    /** Item/list/queue is full. */
    FULL = 28,
    /** Item would overflow. */
    WOULD_OVERFLOW = 29,
    /** Item/list/queue has been overflowed. */
    HAS_OVERFLOWED = 30,
    /** Generic ownership error. */
    OWNERSHIP = 31,
    /** Already/still owning resource. */
    IS_OWNER = 32,
    /** Generic invalid argument or consequence of invalid argument. */
    INVALID_PARAMETER = 33,
    /** Invalid null pointer received as argument. */
    NULL_POINTER = 34,
    /** Invalid configuration provided. */
    INVALID_CONFIGURATION = 35,
    /** Invalid mode. */
    INVALID_MODE = 36,
    /** Invalid handle. */
    INVALID_HANDLE = 37,
    /** Invalid type for operation. */
    INVALID_TYPE = 38,
    /** Invalid index. */
    INVALID_INDEX = 39,
    /** Invalid range. */
    INVALID_RANGE = 40,
    /** Invalid key. */
    INVALID_KEY = 41,
    /** Invalid credentials. */
    INVALID_CREDENTIALS = 42,
    /** Invalid count. */
    INVALID_COUNT = 43,
    /** Invalid signature / verification failed. */
    INVALID_SIGNATURE = 44,
    /** Item could not be found. */
    NOT_FOUND = 45,
    /** Item already exists. */
    ALREADY_EXISTS = 46,
    /** Generic I/O failure. */
    IO = 47,
    /** I/O failure due to timeout. */
    IO_TIMEOUT = 48,
    /** Generic transmission error. */
    TRANSMIT = 49,
    /** Transmit underflowed. */
    TRANSMIT_UNDERFLOW = 50,
    /** Transmit is incomplete. */
    TRANSMIT_INCOMPLETE = 51,
    /** Transmit is busy. */
    TRANSMIT_BUSY = 52,
    /** Generic reception error. */
    RECEIVE = 53,
    /** Failed to read on/via given object. */
    OBJECT_READ = 54,
    /** Failed to write on/via given object. */
    OBJECT_WRITE = 55,
    /** Message is too long. */
    MESSAGE_TOO_LONG = 56,
    /** EEPROM MFG version mismatch. */
    EEPROM_MFG_VERSION_MISMATCH = 57,
    /** EEPROM Stack version mismatch. */
    EEPROM_STACK_VERSION_MISMATCH = 58,
    /** Flash write is inhibited. */
    FLASH_WRITE_INHIBITED = 59,
    /** Flash verification failed. */
    FLASH_VERIFY_FAILED = 60,
    /** Flash programming failed. */
    FLASH_PROGRAM_FAILED = 61,
    /** Flash erase failed. */
    FLASH_ERASE_FAILED = 62,
    /** MAC no data. */
    MAC_NO_DATA = 63,
    /** MAC no ACK received. */
    MAC_NO_ACK_RECEIVED = 64,
    /** MAC indirect timeout. */
    MAC_INDIRECT_TIMEOUT = 65,
    /** MAC unknown header type. */
    MAC_UNKNOWN_HEADER_TYPE = 66,
    /** MAC ACK unknown header type. */
    MAC_ACK_HEADER_TYPE = 67,
    /** MAC command transmit failure. */
    MAC_COMMAND_TRANSMIT_FAILURE = 68,
    /** Error in open NVM */
    CLI_STORAGE_NVM_OPEN_ERROR = 69,
    /** Image checksum is not valid. */
    SECURITY_IMAGE_CHECKSUM_ERROR = 70,
    /** Decryption failed */
    SECURITY_DECRYPT_ERROR = 71,
    /** Command was not recognized */
    COMMAND_IS_INVALID = 72,
    /** Command or parameter maximum length exceeded */
    COMMAND_TOO_LONG = 73,
    /** Data received does not form a complete command */
    COMMAND_INCOMPLETE = 74,
    /** Bus error, e.g. invalid DMA address */
    BUS_ERROR = 75,
    /** CCA failure. */
    CCA_FAILURE = 76,
    /** MAC scanning. */
    MAC_SCANNING = 77,
    /** MAC incorrect scan type. */
    MAC_INCORRECT_SCAN_TYPE = 78,
    /** Invalid channel mask. */
    INVALID_CHANNEL_MASK = 79,
    /** Bad scan duration. */
    BAD_SCAN_DURATION = 80,
    /** Bonding procedure can't be started because device has no space left for bond. */
    BT_OUT_OF_BONDS = 1026,
    /** Unspecified error */
    BT_UNSPECIFIED = 1027,
    /** Hardware failure */
    BT_HARDWARE = 1028,
    /** The bonding does not exist. */
    BT_NO_BONDING = 1030,
    /** Error using crypto functions */
    BT_CRYPTO = 1031,
    /** Data was corrupted. */
    BT_DATA_CORRUPTED = 1032,
    /** Invalid periodic advertising sync handle */
    BT_INVALID_SYNC_HANDLE = 1034,
    /** Bluetooth cannot be used on this hardware */
    BT_INVALID_MODULE_ACTION = 1035,
    /** Error received from radio */
    BT_RADIO = 1036,
    /** Returned when remote disconnects the connection-oriented channel by sending disconnection request. */
    BT_L2CAP_REMOTE_DISCONNECTED = 1037,
    /** Returned when local host disconnect the connection-oriented channel by sending disconnection request. */
    BT_L2CAP_LOCAL_DISCONNECTED = 1038,
    /** Returned when local host did not find a connection-oriented channel with given destination CID. */
    BT_L2CAP_CID_NOT_EXIST = 1039,
    /** Returned when connection-oriented channel disconnected due to LE connection is dropped. */
    BT_L2CAP_LE_DISCONNECTED = 1040,
    /** Returned when connection-oriented channel disconnected due to remote end send data even without credit. */
    BT_L2CAP_FLOW_CONTROL_VIOLATED = 1042,
    /** Returned when connection-oriented channel disconnected due to remote end send flow control credits exceed 65535. */
    BT_L2CAP_FLOW_CONTROL_CREDIT_OVERFLOWED = 1043,
    /** Returned when connection-oriented channel has run out of flow control credit and local application still trying to send data. */
    BT_L2CAP_NO_FLOW_CONTROL_CREDIT = 1044,
    /** Returned when connection-oriented channel has not received connection response message within maximum timeout. */
    BT_L2CAP_CONNECTION_REQUEST_TIMEOUT = 1045,
    /** Returned when local host received a connection-oriented channel connection response with an invalid destination CID. */
    BT_L2CAP_INVALID_CID = 1046,
    /** Returned when local host application tries to send a command which is not suitable for L2CAP channel's current state. */
    BT_L2CAP_WRONG_STATE = 1047,
    /** Flash reserved for PS store is full */
    BT_PS_STORE_FULL = 1051,
    /** PS key not found */
    BT_PS_KEY_NOT_FOUND = 1052,
    /** Mismatched or insufficient security level */
    BT_APPLICATION_MISMATCHED_OR_INSUFFICIENT_SECURITY = 1053,
    /** Encryption/decryption operation failed. */
    BT_APPLICATION_ENCRYPTION_DECRYPTION_ERROR = 1054,
    /** Connection does not exist, or connection open request was cancelled. */
    BT_CTRL_UNKNOWN_CONNECTION_IDENTIFIER = 4098,
    /**
     * Pairing or authentication failed due to incorrect results in the pairing or authentication procedure.
     * This could be due to an incorrect PIN or Link Key
     */
    BT_CTRL_AUTHENTICATION_FAILURE = 4101,
    /** Pairing failed because of missing PIN, or authentication failed because of missing Key */
    BT_CTRL_PIN_OR_KEY_MISSING = 4102,
    /** Controller is out of memory. */
    BT_CTRL_MEMORY_CAPACITY_EXCEEDED = 4103,
    /** Link supervision timeout has expired. */
    BT_CTRL_CONNECTION_TIMEOUT = 4104,
    /** Controller is at limit of connections it can support. */
    BT_CTRL_CONNECTION_LIMIT_EXCEEDED = 4105,
    /**
     * The Synchronous Connection Limit to a Device Exceeded error code indicates that the Controller has reached
     * the limit to the number of synchronous connections that can be achieved to a device.
     */
    BT_CTRL_SYNCHRONOUS_CONNECTION_LIMIT_EXCEEDED = 4106,
    /**
     * The ACL Connection Already Exists error code indicates that an attempt to create a new ACL Connection
     * to a device when there is already a connection to this device.
     */
    BT_CTRL_ACL_CONNECTION_ALREADY_EXISTS = 4107,
    /** Command requested cannot be executed because the Controller is in a state where it cannot process this command at this time. */
    BT_CTRL_COMMAND_DISALLOWED = 4108,
    /** The Connection Rejected Due To Limited Resources error code indicates that an incoming connection was rejected due to limited resources. */
    BT_CTRL_CONNECTION_REJECTED_DUE_TO_LIMITED_RESOURCES = 4109,
    /**
     * The Connection Rejected Due To Security Reasons error code indicates that a connection was rejected due
     * to security requirements not being fulfilled, like authentication or pairing.
     */
    BT_CTRL_CONNECTION_REJECTED_DUE_TO_SECURITY_REASONS = 4110,
    /**
     * The Connection was rejected because this device does not accept the BD_ADDR.
     * This may be because the device will only accept connections from specific BD_ADDRs.
     */
    BT_CTRL_CONNECTION_REJECTED_DUE_TO_UNACCEPTABLE_BD_ADDR = 4111,
    /** The Connection Accept Timeout has been exceeded for this connection attempt. */
    BT_CTRL_CONNECTION_ACCEPT_TIMEOUT_EXCEEDED = 4112,
    /** A feature or parameter value in the HCI command is not supported. */
    BT_CTRL_UNSUPPORTED_FEATURE_OR_PARAMETER_VALUE = 4113,
    /** Command contained invalid parameters. */
    BT_CTRL_INVALID_COMMAND_PARAMETERS = 4114,
    /** User on the remote device terminated the connection. */
    BT_CTRL_REMOTE_USER_TERMINATED = 4115,
    /** The remote device terminated the connection because of low resources */
    BT_CTRL_REMOTE_DEVICE_TERMINATED_CONNECTION_DUE_TO_LOW_RESOURCES = 4116,
    /** Remote Device Terminated Connection due to Power Off */
    BT_CTRL_REMOTE_POWERING_OFF = 4117,
    /** Local device terminated the connection. */
    BT_CTRL_CONNECTION_TERMINATED_BY_LOCAL_HOST = 4118,
    /**
     * The Controller is disallowing an authentication or pairing procedure because too little time has elapsed
     * since the last authentication or pairing attempt failed.
     */
    BT_CTRL_REPEATED_ATTEMPTS = 4119,
    /**
     * The device does not allow pairing. This can be for example, when a device only allows pairing during
     * a certain time window after some user input allows pairing
     */
    BT_CTRL_PAIRING_NOT_ALLOWED = 4120,
    /** The remote device does not support the feature associated with the issued command. */
    BT_CTRL_UNSUPPORTED_REMOTE_FEATURE = 4122,
    /** No other error code specified is appropriate to use. */
    BT_CTRL_UNSPECIFIED_ERROR = 4127,
    /** Connection terminated due to link-layer procedure timeout. */
    BT_CTRL_LL_RESPONSE_TIMEOUT = 4130,
    /** LL procedure has collided with the same transaction or procedure that is already in progress. */
    BT_CTRL_LL_PROCEDURE_COLLISION = 4131,
    /** The requested encryption mode is not acceptable at this time. */
    BT_CTRL_ENCRYPTION_MODE_NOT_ACCEPTABLE = 4133,
    /** Link key cannot be changed because a fixed unit key is being used. */
    BT_CTRL_LINK_KEY_CANNOT_BE_CHANGED = 4134,
    /** LMP PDU or LL PDU that includes an instant cannot be performed because the instant when this would have occurred has passed. */
    BT_CTRL_INSTANT_PASSED = 4136,
    /** It was not possible to pair as a unit key was requested and it is not supported. */
    BT_CTRL_PAIRING_WITH_UNIT_KEY_NOT_SUPPORTED = 4137,
    /** LMP transaction was started that collides with an ongoing transaction. */
    BT_CTRL_DIFFERENT_TRANSACTION_COLLISION = 4138,
    /** The Controller cannot perform channel assessment because it is not supported. */
    BT_CTRL_CHANNEL_ASSESSMENT_NOT_SUPPORTED = 4142,
    /** The HCI command or LMP PDU sent is only possible on an encrypted link. */
    BT_CTRL_INSUFFICIENT_SECURITY = 4143,
    /** A parameter value requested is outside the mandatory range of parameters for the given HCI command or LMP PDU. */
    BT_CTRL_PARAMETER_OUT_OF_MANDATORY_RANGE = 4144,
    /**
     * The IO capabilities request or response was rejected because the sending Host does not support
     * Secure Simple Pairing even though the receiving Link Manager does.
     */
    BT_CTRL_SIMPLE_PAIRING_NOT_SUPPORTED_BY_HOST = 4151,
    /**
     * The Host is busy with another pairing operation and unable to support the requested pairing.
     * The receiving device should retry pairing again later.
     */
    BT_CTRL_HOST_BUSY_PAIRING = 4152,
    /** The Controller could not calculate an appropriate value for the Channel selection operation. */
    BT_CTRL_CONNECTION_REJECTED_DUE_TO_NO_SUITABLE_CHANNEL_FOUND = 4153,
    /** Operation was rejected because the controller is busy and unable to process the request. */
    BT_CTRL_CONTROLLER_BUSY = 4154,
    /** Remote device terminated the connection because of an unacceptable connection interval. */
    BT_CTRL_UNACCEPTABLE_CONNECTION_INTERVAL = 4155,
    /** Advertising for a fixed duration completed or, for directed advertising, that advertising completed without a connection being created. */
    BT_CTRL_ADVERTISING_TIMEOUT = 4156,
    /** Connection was terminated because the Message Integrity Check (MIC) failed on a received packet. */
    BT_CTRL_CONNECTION_TERMINATED_DUE_TO_MIC_FAILURE = 4157,
    /** LL initiated a connection but the connection has failed to be established. Controller did not receive any packets from remote end. */
    BT_CTRL_CONNECTION_FAILED_TO_BE_ESTABLISHED = 4158,
    /** The MAC of the 802.11 AMP was requested to connect to a peer, but the connection failed. */
    BT_CTRL_MAC_CONNECTION_FAILED = 4159,
    /**
     * The master, at this time, is unable to make a coarse adjustment to the piconet clock, using the supplied parameters.
     * Instead the master will attempt to move the clock using clock dragging.
     */
    BT_CTRL_COARSE_CLOCK_ADJUSTMENT_REJECTED_BUT_WILL_TRY_TO_ADJUST_USING_CLOCK_DRAGGING = 4160,
    /** A command was sent from the Host that should identify an Advertising or Sync handle, but the Advertising or Sync handle does not exist. */
    BT_CTRL_UNKNOWN_ADVERTISING_IDENTIFIER = 4162,
    /** Number of operations requested has been reached and has indicated the completion of the activity (e.g., advertising or scanning). */
    BT_CTRL_LIMIT_REACHED = 4163,
    /** A request to the Controller issued by the Host and still pending was successfully canceled. */
    BT_CTRL_OPERATION_CANCELLED_BY_HOST = 4164,
    /** An attempt was made to send or receive a packet that exceeds the maximum allowed packet l */
    BT_CTRL_PACKET_TOO_LONG = 4165,
    /** The attribute handle given was not valid on this server */
    BT_ATT_INVALID_HANDLE = 4353,
    /** The attribute cannot be read */
    BT_ATT_READ_NOT_PERMITTED = 4354,
    /** The attribute cannot be written */
    BT_ATT_WRITE_NOT_PERMITTED = 4355,
    /** The attribute PDU was invalid */
    BT_ATT_INVALID_PDU = 4356,
    /** The attribute requires authentication before it can be read or written. */
    BT_ATT_INSUFFICIENT_AUTHENTICATION = 4357,
    /** Attribute Server does not support the request received from the client. */
    BT_ATT_REQUEST_NOT_SUPPORTED = 4358,
    /** Offset specified was past the end of the attribute */
    BT_ATT_INVALID_OFFSET = 4359,
    /** The attribute requires authorization before it can be read or written. */
    BT_ATT_INSUFFICIENT_AUTHORIZATION = 4360,
    /** Too many prepare writes have been queued */
    BT_ATT_PREPARE_QUEUE_FULL = 4361,
    /** No attribute found within the given attribute handle range. */
    BT_ATT_ATT_NOT_FOUND = 4362,
    /** The attribute cannot be read or written using the Read Blob Request */
    BT_ATT_ATT_NOT_LONG = 4363,
    /** The Encryption Key Size used for encrypting this link is insufficient. */
    BT_ATT_INSUFFICIENT_ENC_KEY_SIZE = 4364,
    /** The attribute value length is invalid for the operation */
    BT_ATT_INVALID_ATT_LENGTH = 4365,
    /** The attribute request that was requested has encountered an error that was unlikely, and therefore could not be completed as requested. */
    BT_ATT_UNLIKELY_ERROR = 4366,
    /** The attribute requires encryption before it can be read or written. */
    BT_ATT_INSUFFICIENT_ENCRYPTION = 4367,
    /** The attribute type is not a supported grouping attribute as defined by a higher layer specification. */
    BT_ATT_UNSUPPORTED_GROUP_TYPE = 4368,
    /** Insufficient Resources to complete the request */
    BT_ATT_INSUFFICIENT_RESOURCES = 4369,
    /** The server requests the client to rediscover the database. */
    BT_ATT_OUT_OF_SYNC = 4370,
    /** The attribute parameter value was not allowed. */
    BT_ATT_VALUE_NOT_ALLOWED = 4371,
    /** When this is returned in a BGAPI response, the application tried to read or write the value of a user attribute from the GATT database. */
    BT_ATT_APPLICATION = 4480,
    /** The requested write operation cannot be fulfilled for reasons other than permissions. */
    BT_ATT_WRITE_REQUEST_REJECTED = 4604,
    /** The Client Characteristic Configuration descriptor is not configured according to the requirements of the profile or service. */
    BT_ATT_CLIENT_CHARACTERISTIC_CONFIGURATION_DESCRIPTOR_IMPROPERLY_CONFIGURED = 4605,
    /** The profile or service request cannot be serviced because an operation that has been previously triggered is still in progress. */
    BT_ATT_PROCEDURE_ALREADY_IN_PROGRESS = 4606,
    /** The attribute value is out of range as defined by a profile or service specification. */
    BT_ATT_OUT_OF_RANGE = 4607,
    /** The user input of passkey failed, for example, the user cancelled the operation */
    BT_SMP_PASSKEY_ENTRY_FAILED = 4609,
    /** Out of Band data is not available for authentication */
    BT_SMP_OOB_NOT_AVAILABLE = 4610,
    /** The pairing procedure cannot be performed as authentication requirements cannot be met due to IO capabilities of one or both devices */
    BT_SMP_AUTHENTICATION_REQUIREMENTS = 4611,
    /** The confirm value does not match the calculated compare value */
    BT_SMP_CONFIRM_VALUE_FAILED = 4612,
    /** Pairing is not supported by the device */
    BT_SMP_PAIRING_NOT_SUPPORTED = 4613,
    /** The resultant encryption key size is insufficient for the security requirements of this device */
    BT_SMP_ENCRYPTION_KEY_SIZE = 4614,
    /** The SMP command received is not supported on this device */
    BT_SMP_COMMAND_NOT_SUPPORTED = 4615,
    /** Pairing failed due to an unspecified reason */
    BT_SMP_UNSPECIFIED_REASON = 4616,
    /** Pairing or authentication procedure is disallowed because too little time has elapsed since last pairing request or security request */
    BT_SMP_REPEATED_ATTEMPTS = 4617,
    /** The Invalid Parameters error code indicates: the command length is invalid or a parameter is outside of the specified range. */
    BT_SMP_INVALID_PARAMETERS = 4618,
    /** Indicates to the remote device that the DHKey Check value received doesn't match the one calculated by the local device. */
    BT_SMP_DHKEY_CHECK_FAILED = 4619,
    /** Indicates that the confirm values in the numeric comparison protocol do not match. */
    BT_SMP_NUMERIC_COMPARISON_FAILED = 4620,
    /** Indicates that the pairing over the LE transport failed due to a Pairing Request sent over the BR/EDR transport in process. */
    BT_SMP_BREDR_PAIRING_IN_PROGRESS = 4621,
    /** Indicates that the BR/EDR Link Key generated on the BR/EDR transport cannot be used to derive and distribute keys for the LE transport. */
    BT_SMP_CROSS_TRANSPORT_KEY_DERIVATION_GENERATION_NOT_ALLOWED = 4622,
    /** Indicates that the device chose not to accept a distributed key. */
    BT_SMP_KEY_REJECTED = 4623,
    /** Returned when trying to add a key or some other unique resource with an ID which already exists */
    BT_MESH_ALREADY_EXISTS = 1281,
    /** Returned when trying to manipulate a key or some other resource with an ID which does not exist */
    BT_MESH_DOES_NOT_EXIST = 1282,
    /**
     * Returned when an operation cannot be executed because a pre-configured limit for keys, key bindings,
     * elements, models, virtual addresses, provisioned devices, or provisioning sessions is reached
     */
    BT_MESH_LIMIT_REACHED = 1283,
    /** Returned when trying to use a reserved address or add a "pre-provisioned" device using an address already used by some other device */
    BT_MESH_INVALID_ADDRESS = 1284,
    /** In a BGAPI response, the user supplied malformed data; in a BGAPI event, the remote end responded with malformed or unrecognized data */
    BT_MESH_MALFORMED_DATA = 1285,
    /** An attempt was made to initialize a subsystem that was already initialized. */
    BT_MESH_ALREADY_INITIALIZED = 1286,
    /** An attempt was made to use a subsystem that wasn't initialized yet. Call the subsystem's init function first. */
    BT_MESH_NOT_INITIALIZED = 1287,
    /** Returned when trying to establish a friendship as a Low Power Node, but no acceptable friend offer message was received. */
    BT_MESH_NO_FRIEND_OFFER = 1288,
    /** Provisioning link was unexpectedly closed before provisioning was complete. */
    BT_MESH_PROV_LINK_CLOSED = 1289,
    /**An unrecognized provisioning PDU was received. */
    BT_MESH_PROV_INVALID_PDU = 1290,
    /**A provisioning PDU with wrong length or containing field values that are out of bounds was received. */
    BT_MESH_PROV_INVALID_PDU_FORMAT = 1291,
    /**An unexpected (out of sequence) provisioning PDU was received. */
    BT_MESH_PROV_UNEXPECTED_PDU = 1292,
    /**The computed confirmation value did not match the expected value. */
    BT_MESH_PROV_CONFIRMATION_FAILED = 1293,
    /**Provisioning could not be continued due to insufficient resources. */
    BT_MESH_PROV_OUT_OF_RESOURCES = 1294,
    /**The provisioning data block could not be decrypted. */
    BT_MESH_PROV_DECRYPTION_FAILED = 1295,
    /**An unexpected error happened during provisioning. */
    BT_MESH_PROV_UNEXPECTED_ERROR = 1296,
    /**Device could not assign unicast addresses to all of its elements. */
    BT_MESH_PROV_CANNOT_ASSIGN_ADDR = 1297,
    /**Returned when trying to reuse an address of a previously deleted device before an IV Index Update has been executed. */
    BT_MESH_ADDRESS_TEMPORARILY_UNAVAILABLE = 1298,
    /**Returned when trying to assign an address that is used by one of the devices in the Device Database, or by the Provisioner itself. */
    BT_MESH_ADDRESS_ALREADY_USED = 1299,
    /**Application key or publish address are not set */
    BT_MESH_PUBLISH_NOT_CONFIGURED = 1300,
    /**Application key is not bound to a model */
    BT_MESH_APP_KEY_NOT_BOUND = 1301,
    /** Returned when address in request was not valid */
    BT_MESH_FOUNDATION_INVALID_ADDRESS = 4865,
    /** Returned when model identified is not found for a given element */
    BT_MESH_FOUNDATION_INVALID_MODEL = 4866,
    /** Returned when the key identified by AppKeyIndex is not stored in the node */
    BT_MESH_FOUNDATION_INVALID_APP_KEY = 4867,
    /** Returned when the key identified by NetKeyIndex is not stored in the node */
    BT_MESH_FOUNDATION_INVALID_NET_KEY = 4868,
    /** Returned when The node cannot serve the request due to insufficient resources */
    BT_MESH_FOUNDATION_INSUFFICIENT_RESOURCES = 4869,
    /** Returned when the key identified is already stored in the node and the new NetKey value is different */
    BT_MESH_FOUNDATION_KEY_INDEX_EXISTS = 4870,
    /** Returned when the model does not support the publish mechanism */
    BT_MESH_FOUNDATION_INVALID_PUBLISH_PARAMS = 4871,
    /** Returned when  the model does not support the subscribe mechanism */
    BT_MESH_FOUNDATION_NOT_SUBSCRIBE_MODEL = 4872,
    /** Returned when storing of the requested parameters failed */
    BT_MESH_FOUNDATION_STORAGE_FAILURE = 4873,
    /**Returned when requested setting is not supported */
    BT_MESH_FOUNDATION_NOT_SUPPORTED = 4874,
    /**Returned when the requested update operation cannot be performed due to general constraints */
    BT_MESH_FOUNDATION_CANNOT_UPDATE = 4875,
    /**Returned when the requested delete operation cannot be performed due to general constraints */
    BT_MESH_FOUNDATION_CANNOT_REMOVE = 4876,
    /**Returned when the requested bind operation cannot be performed due to general constraints */
    BT_MESH_FOUNDATION_CANNOT_BIND = 4877,
    /**Returned when The node cannot start advertising with Node Identity or Proxy since the maximum number of parallel advertising is reached */
    BT_MESH_FOUNDATION_TEMPORARILY_UNABLE = 4878,
    /**Returned when the requested state cannot be set */
    BT_MESH_FOUNDATION_CANNOT_SET = 4879,
    /**Returned when an unspecified error took place */
    BT_MESH_FOUNDATION_UNSPECIFIED = 4880,
    /**Returned when the NetKeyIndex and AppKeyIndex combination is not valid for a Config AppKey Update */
    BT_MESH_FOUNDATION_INVALID_BINDING = 4881,
    /** Invalid firmware keyset */
    WIFI_INVALID_KEY = 2817,
    /** The firmware download took too long */
    WIFI_FIRMWARE_DOWNLOAD_TIMEOUT = 2818,
    /** Unknown request ID or wrong interface ID used */
    WIFI_UNSUPPORTED_MESSAGE_ID = 2819,
    /** The request is successful but some parameters have been ignored */
    WIFI_WARNING = 2820,
    /** No Packets waiting to be received */
    WIFI_NO_PACKET_TO_RECEIVE = 2821,
    /** The sleep mode is granted */
    WIFI_SLEEP_GRANTED = 2824,
    /** The WFx does not go back to sleep */
    WIFI_SLEEP_NOT_GRANTED = 2825,
    /** The SecureLink MAC key was not found */
    WIFI_SECURE_LINK_MAC_KEY_ERROR = 2832,
    /** The SecureLink MAC key is already installed in OTP */
    WIFI_SECURE_LINK_MAC_KEY_ALREADY_BURNED = 2833,
    /** The SecureLink MAC key cannot be installed in RAM */
    WIFI_SECURE_LINK_RAM_MODE_NOT_ALLOWED = 2834,
    /** The SecureLink MAC key installation failed */
    WIFI_SECURE_LINK_FAILED_UNKNOWN_MODE = 2835,
    /** SecureLink key (re)negotiation failed */
    WIFI_SECURE_LINK_EXCHANGE_FAILED = 2836,
    /** The device is in an inappropriate state to perform the request */
    WIFI_WRONG_STATE = 2840,
    /** The request failed due to regulatory limitations */
    WIFI_CHANNEL_NOT_ALLOWED = 2841,
    /** The connection request failed because no suitable AP was found */
    WIFI_NO_MATCHING_AP = 2842,
    /** The connection request was aborted by host */
    WIFI_CONNECTION_ABORTED = 2843,
    /** The connection request failed because of a timeout */
    WIFI_CONNECTION_TIMEOUT = 2844,
    /** The connection request failed because the AP rejected the device */
    WIFI_CONNECTION_REJECTED_BY_AP = 2845,
    /** The connection request failed because the WPA handshake did not complete successfully */
    WIFI_CONNECTION_AUTH_FAILURE = 2846,
    /** The request failed because the retry limit was exceeded */
    WIFI_RETRY_EXCEEDED = 2847,
    /** The request failed because the MSDU life time was exceeded */
    WIFI_TX_LIFETIME_EXCEEDED = 2848,
    /** Critical fault */
    COMPUTE_DRIVER_FAULT = 5377,
    /** ALU operation output NaN */
    COMPUTE_DRIVER_ALU_NAN = 5378,
    /** ALU numeric overflow */
    COMPUTE_DRIVER_ALU_OVERFLOW = 5379,
    /** ALU numeric underflow */
    COMPUTE_DRIVER_ALU_UNDERFLOW = 5380,
    /** Overflow during array store */
    COMPUTE_DRIVER_STORE_CONVERSION_OVERFLOW = 5381,
    /** Underflow during array store conversion */
    COMPUTE_DRIVER_STORE_CONVERSION_UNDERFLOW = 5382,
    /** Infinity encountered during array store conversion */
    COMPUTE_DRIVER_STORE_CONVERSION_INFINITY = 5383,
    /** NaN encountered during array store conversion */
    COMPUTE_DRIVER_STORE_CONVERSION_NAN = 5384,
    /** MATH NaN encountered */
    COMPUTE_MATH_NAN = 5394,
    /** MATH Infinity encountered */
    COMPUTE_MATH_INFINITY = 5395,
    /** MATH numeric overflow */
    COMPUTE_MATH_OVERFLOW = 5396,
    /** MATH numeric underflow */
    COMPUTE_MATH_UNDERFLOW = 5397
}
/**
 * Many EmberZNet API functions return an ::EmberStatus value to indicate the success or failure of the call.
 * Return codes are one byte long.
 */
export declare enum EmberStatus {
    /** The generic "no error" message. */
    SUCCESS = 0,
    /** The generic "fatal error" message. */
    ERR_FATAL = 1,
    /** An invalid value was passed as an argument to a function. */
    BAD_ARGUMENT = 2,
    /** The requested information was not found. */
    NOT_FOUND = 3,
    /** The manufacturing and stack token format in non-volatile memory is different than what the stack expects (returned at initialization). */
    EEPROM_MFG_STACK_VERSION_MISMATCH = 4,
    /** The manufacturing token format in non-volatile memory is different than what the stack expects (returned at initialization). */
    EEPROM_MFG_VERSION_MISMATCH = 6,
    /** The stack token format in non-volatile memory is different than what the stack expects (returned at initialization). */
    EEPROM_STACK_VERSION_MISMATCH = 7,
    /** There are no more buffers. */
    NO_BUFFERS = 24,
    /** Packet is dropped by packet-handoff callbacks. */
    PACKET_HANDOFF_DROP_PACKET = 25,
    /** Specifies an invalid baud rate. */
    SERIAL_INVALID_BAUD_RATE = 32,
    /** Specifies an invalid serial port. */
    SERIAL_INVALID_PORT = 33,
    /** Tried to send too much data. */
    SERIAL_TX_OVERFLOW = 34,
    /** There wasn't enough space to store a received character and the character was dropped. */
    SERIAL_RX_OVERFLOW = 35,
    /** Detected a UART framing error. */
    SERIAL_RX_FRAME_ERROR = 36,
    /** Detected a UART parity error. */
    SERIAL_RX_PARITY_ERROR = 37,
    /** There is no received data to process. */
    SERIAL_RX_EMPTY = 38,
    /** The receive interrupt was not handled in time and a character was dropped. */
    SERIAL_RX_OVERRUN_ERROR = 39,
    /** The MAC transmit queue is full. */
    MAC_TRANSMIT_QUEUE_FULL = 57,
    /** MAC header FCF error on receive. */
    MAC_UNKNOWN_HEADER_TYPE = 58,
    /** MAC ACK header received. */
    MAC_ACK_HEADER_TYPE = 59,
    /** The MAC can't complete this task because it is scanning. */
    MAC_SCANNING = 61,
    /** No pending data exists for a data poll. */
    MAC_NO_DATA = 49,
    /** Attempts to scan when joined to a network. */
    MAC_JOINED_NETWORK = 50,
    /** Scan duration must be 0 to 14 inclusive. Tried to scan with an incorrect duration value. */
    MAC_BAD_SCAN_DURATION = 51,
    /** emberStartScan was called with an incorrect scan type. */
    MAC_INCORRECT_SCAN_TYPE = 52,
    /** emberStartScan was called with an invalid channel mask. */
    MAC_INVALID_CHANNEL_MASK = 53,
    /** Failed to scan the current channel because the relevant MAC command could not be transmitted. */
    MAC_COMMAND_TRANSMIT_FAILURE = 54,
    /** An ACK was expected following the transmission but the MAC level ACK was never received. */
    MAC_NO_ACK_RECEIVED = 64,
    /** MAC failed to transmit a message because it could not successfully perform a radio network switch. */
    MAC_RADIO_NETWORK_SWITCH_FAILED = 65,
    /** An indirect data message timed out before a poll requested it. */
    MAC_INDIRECT_TIMEOUT = 66,
    /**
     * The Simulated EEPROM is telling the application that at least one flash page to be erased.
     * The GREEN status means the current page has not filled above the ::ERASE_CRITICAL_THRESHOLD.
     *
     * The application should call the function ::halSimEepromErasePage() when it can to erase a page.
     */
    SIM_EEPROM_ERASE_PAGE_GREEN = 67,
    /**
     * The Simulated EEPROM is telling the application that at least one flash page must be erased.
     * The RED status means the current page has filled above the ::ERASE_CRITICAL_THRESHOLD.
     *
     * Due to the shrinking availability of write space, data could be lost.
     * The application must call the function ::halSimEepromErasePage() as soon as possible to erase a page.
     */
    SIM_EEPROM_ERASE_PAGE_RED = 68,
    /**
     * The Simulated EEPROM has run out of room to write new data and the data trying to be set has been lost.
     * This error code is the result of ignoring the ::SIM_EEPROM_ERASE_PAGE_RED error code.
     *
     * The application must call the function ::halSimEepromErasePage() to make room for any further calls to set a token.
     */
    SIM_EEPROM_FULL = 69,
    /**
     * Attempt 1 to initialize the Simulated EEPROM has failed.
     *
     * This failure means the information already stored in the Flash (or a lack thereof),
     * is fatally incompatible with the token information compiled into the code image being run.
     */
    SIM_EEPROM_INIT_1_FAILED = 72,
    /**
     * Attempt 2 to initialize the Simulated EEPROM has failed.
     *
     * This failure means Attempt 1 failed, and the token system failed to properly reload default tokens and reset the Simulated EEPROM.
     */
    SIM_EEPROM_INIT_2_FAILED = 73,
    /**
     * Attempt 3 to initialize the Simulated EEPROM has failed.
     *
     * This failure means one or both of the tokens ::TOKEN_MFG_NVDATA_VERSION or ::TOKEN_STACK_NVDATA_VERSION
     * were incorrect and the token system failed to properly reload default tokens and reset the Simulated EEPROM.
     */
    SIM_EEPROM_INIT_3_FAILED = 74,
    /**
     * The Simulated EEPROM is repairing itself.
     *
     * While there's nothing for an app to do when the SimEE is going to
     * repair itself (SimEE has to be fully functional for the rest of the
     * system to work), alert the application to the fact that repair
     * is occurring.  There are debugging scenarios where an app might want
     * to know that repair is happening, such as monitoring frequency.
     * @note  Common situations will trigger an expected repair, such as
     *        using an erased chip or changing token definitions.
     */
    SIM_EEPROM_REPAIRING = 77,
    /**
     * A fatal error has occurred while trying to write data to the Flash.
     * The target memory attempting to be programmed is already programmed.
     * The flash write routines were asked to flip a bit from a 0 to 1,
     * which is physically impossible and the write was therefore inhibited.
     * The data in the Flash cannot be trusted after this error.
     */
    ERR_FLASH_WRITE_INHIBITED = 70,
    /**
     * A fatal error has occurred while trying to write data to the Flash and the write verification has failed.
     * Data in the Flash cannot be trusted after this error and it is possible this error is the result of exceeding the life cycles of the Flash.
     */
    ERR_FLASH_VERIFY_FAILED = 71,
    /**
     * A fatal error has occurred while trying to write data to the Flash possibly due to write protection or an invalid address.
     * Data in the Flash cannot be trusted after this error and it is possible this error is the result of exceeding the life cycles of the Flash.
     */
    ERR_FLASH_PROG_FAIL = 75,
    /**
     * A fatal error has occurred while trying to erase the Flash possibly due to write protection.
     * Data in the Flash cannot be trusted after this error and it is possible this error is the result of exceeding the life cycles of the Flash.
     */
    ERR_FLASH_ERASE_FAIL = 76,
    /** The bootloader received an invalid message (failed attempt to go into bootloader). */
    ERR_BOOTLOADER_TRAP_TABLE_BAD = 88,
    /** The bootloader received an invalid message (failed attempt to go into the bootloader). */
    ERR_BOOTLOADER_TRAP_UNKNOWN = 89,
    /** The bootloader cannot complete the bootload operation because either an image was not found or the image exceeded memory bounds. */
    ERR_BOOTLOADER_NO_IMAGE = 90,
    /** The APS layer attempted to send or deliver a message and failed. */
    DELIVERY_FAILED = 102,
    /** This binding index is out of range for the current binding table. */
    BINDING_INDEX_OUT_OF_RANGE = 105,
    /** This address table index is out of range for the current address table. */
    ADDRESS_TABLE_INDEX_OUT_OF_RANGE = 106,
    /** An invalid binding table index was given to a function. */
    INVALID_BINDING_INDEX = 108,
    /** The API call is not allowed given the current state of the stack. */
    INVALID_CALL = 112,
    /** The link cost to a node is not known. */
    COST_NOT_KNOWN = 113,
    /** The maximum number of in-flight messages  = i.e., ::EMBER_APS_UNICAST_MESSAGE_COUNT, has been reached. */
    MAX_MESSAGE_LIMIT_REACHED = 114,
    /** The message to be transmitted is too big to fit into a single over-the-air packet. */
    MESSAGE_TOO_LONG = 116,
    /** The application is trying to delete or overwrite a binding that is in use. */
    BINDING_IS_ACTIVE = 117,
    /** The application is trying to overwrite an address table entry that is in use. */
    ADDRESS_TABLE_ENTRY_IS_ACTIVE = 118,
    /** An attempt was made to transmit during the suspend period. */
    TRANSMISSION_SUSPENDED = 119,
    /** Security match. */
    MATCH = 120,
    /** Drop frame. */
    DROP_FRAME = 121,
    /** */
    PASS_UNPROCESSED = 122,
    /** */
    TX_THEN_DROP = 123,
    /** */
    NO_SECURITY = 124,
    /** */
    COUNTER_FAILURE = 125,
    /** */
    AUTH_FAILURE = 126,
    /** */
    UNPROCESSED = 127,
    /** The conversion is complete. */
    ADC_CONVERSION_DONE = 128,
    /** The conversion cannot be done because a request is being processed. */
    ADC_CONVERSION_BUSY = 129,
    /** The conversion is deferred until the current request has been processed. */
    ADC_CONVERSION_DEFERRED = 130,
    /** No results are pending. */
    ADC_NO_CONVERSION_PENDING = 132,
    /** Sleeping (for a duration) has been abnormally interrupted and exited prematurely. */
    SLEEP_INTERRUPTED = 133,
    /**
     * The transmit attempt failed because the radio scheduler could not find a slot
     * to transmit this packet in or a higher priority event interrupted it.
     */
    PHY_TX_SCHED_FAIL = 135,
    /** The transmit hardware buffer underflowed. */
    PHY_TX_UNDERFLOW = 136,
    /** The transmit hardware did not finish transmitting a packet. */
    PHY_TX_INCOMPLETE = 137,
    /** An unsupported channel setting was specified. */
    PHY_INVALID_CHANNEL = 138,
    /** An unsupported power setting was specified. */
    PHY_INVALID_POWER = 139,
    /** The requested operation cannot be completed because the radio is currently busy, either transmitting a packet or performing calibration. */
    PHY_TX_BUSY = 140,
    /** The transmit attempt failed because all CCA attempts indicated that the channel was busy. */
    PHY_TX_CCA_FAIL = 141,
    /**
     * The transmit attempt was blocked from going over the air.
     * Typically this is due to the Radio Hold Off (RHO) or Coexistence plugins as they can prevent transmits based on external signals.
     */
    PHY_TX_BLOCKED = 142,
    /** The expected ACK was received after the last transmission. */
    PHY_ACK_RECEIVED = 143,
    /** The stack software has completed initialization and is ready to send and receive packets over the air. */
    NETWORK_UP = 144,
    /** The network is not operating. */
    NETWORK_DOWN = 145,
    /** An attempt to join a network failed. */
    JOIN_FAILED = 148,
    /** After moving, a mobile node's attempt to re-establish contact with the network failed. */
    MOVE_FAILED = 150,
    /**
     * An attempt to join as a router failed due to a Zigbee versus Zigbee Pro incompatibility.
     * Zigbee devices joining Zigbee Pro networks (or vice versa) must join as End Devices, not Routers.
     */
    CANNOT_JOIN_AS_ROUTER = 152,
    /** The local node ID has changed. The application can get the new node ID by calling ::emberGetNodeId(). */
    NODE_ID_CHANGED = 153,
    /** The local PAN ID has changed. The application can get the new PAN ID by calling ::emberGetPanId(). */
    PAN_ID_CHANGED = 154,
    /** The channel has changed. */
    CHANNEL_CHANGED = 155,
    /** The network has been opened for joining. */
    NETWORK_OPENED = 156,
    /** The network has been closed for joining. */
    NETWORK_CLOSED = 157,
    /** An attempt to join or rejoin the network failed because no router beacons could be heard by the joining node. */
    NO_BEACONS = 171,
    /**
     * An attempt was made to join a Secured Network using a pre-configured key, but the Trust Center sent back a
     * Network Key in-the-clear when an encrypted Network Key was required. (::EMBER_REQUIRE_ENCRYPTED_KEY).
     */
    RECEIVED_KEY_IN_THE_CLEAR = 172,
    /** An attempt was made to join a Secured Network, but the device did not receive a Network Key. */
    NO_NETWORK_KEY_RECEIVED = 173,
    /** After a device joined a Secured Network, a Link Key was requested (::EMBER_GET_LINK_KEY_WHEN_JOINING) but no response was ever received. */
    NO_LINK_KEY_RECEIVED = 174,
    /**
     * An attempt was made to join a Secured Network without a pre-configured key,
     * but the Trust Center sent encrypted data using a pre-configured key.
     */
    PRECONFIGURED_KEY_REQUIRED = 175,
    /** The passed key data is not valid. A key of all zeros or all F's are reserved values and cannot be used. */
    KEY_INVALID = 178,
    /** The chosen security level (the value of ::EMBER_SECURITY_LEVEL) is not supported by the stack. */
    INVALID_SECURITY_LEVEL = 149,
    /**
     * An error occurred when trying to encrypt at the APS Level.
     *
     * To APS encrypt an outgoing packet, the sender
     * needs to know the EUI64 of the destination. This error occurs because
     * the EUI64 of the destination can't be determined from
     * the short address (no entry in the neighbor, child, binding
     * or address tables).
     *
     * Every time this error code is seen, note that the stack initiates an
     * IEEE address discovery request behind the scenes. Responses
     * to the request are stored in the trust center cache portion of the
     * address table. Note that you need at least 1 entry allocated for
     * TC cache in the address table plugin. Depending on the available rows in
     * the table, newly discovered addresses may replace old ones. The address
     * table plugin is enabled by default on the host. If you are using an SoC
     * platform, please be sure to add the address table plugin.
     *
     * When customers choose to send APS messages by using short addresses,
     * they should incorporate a retry mechanism and try again, no sooner than
     * 2 seconds later, to resend the APS message. If the app always
     * receives 0xBE (IEEE_ADDRESS_DISCOVERY_IN_PROGRESS) after
     * multiple retries, that might indicate that:
     * a) destination node is not on the network
     * b) there are problems with the health of the network
     * c) there may not be any space set aside in the address table for
     *    the newly discovered address - this can be rectified by reserving
     *    more entries for the trust center cache in the address table plugin
     */
    IEEE_ADDRESS_DISCOVERY_IN_PROGRESS = 190,
    /**
     * An error occurred when trying to encrypt at the APS Level.
     *
     * This error occurs either because the long address of the recipient can't be
     * determined from the short address (no entry in the binding table)
     * or there is no link key entry in the table associated with the destination,
     * or there was a failure to load the correct key into the encryption core.
     */
    APS_ENCRYPTION_ERROR = 166,
    /** There was an attempt to form or join a network with security without calling ::emberSetInitialSecurityState() first. */
    SECURITY_STATE_NOT_SET = 168,
    /**
     * There was an attempt to set an entry in the key table using an invalid long address. Invalid addresses include:
     *    - The local device's IEEE address
     *    - Trust Center's IEEE address
     *    - An existing table entry's IEEE address
     *    - An address consisting of all zeros or all F's
     */
    KEY_TABLE_INVALID_ADDRESS = 179,
    /** There was an attempt to set a security configuration that is not valid given the other security settings. */
    SECURITY_CONFIGURATION_INVALID = 183,
    /**
     * There was an attempt to broadcast a key switch too quickly after broadcasting the next network key.
     * The Trust Center must wait at least a period equal to the broadcast timeout so that all routers have a chance
     * to receive the broadcast of the new network key.
     */
    TOO_SOON_FOR_SWITCH_KEY = 184,
    /** The received signature corresponding to the message that was passed to the CBKE Library failed verification and is not valid. */
    SIGNATURE_VERIFY_FAILURE = 185,
    /**
     * The message could not be sent because the link key corresponding to the destination is not authorized for use in APS data messages.
     * APS Commands (sent by the stack) are allowed.
     * To use it for encryption of APS data messages it must be authorized using a key agreement protocol (such as CBKE).
    */
    KEY_NOT_AUTHORIZED = 187,
    /** The security data provided was not valid, or an integrity check failed. */
    SECURITY_DATA_INVALID = 189,
    /** The node has not joined a network. */
    NOT_JOINED = 147,
    /** A message cannot be sent because the network is currently overloaded. */
    NETWORK_BUSY = 161,
    /** The application tried to send a message using an endpoint that it has not defined. */
    INVALID_ENDPOINT = 163,
    /** The application tried to use a binding that has been remotely modified and the change has not yet been reported to the application. */
    BINDING_HAS_CHANGED = 164,
    /** An attempt to generate random bytes failed because of insufficient random data from the radio. */
    INSUFFICIENT_RANDOM_DATA = 165,
    /** A Zigbee route error command frame was received indicating that a source routed message from this node failed en route. */
    SOURCE_ROUTE_FAILURE = 169,
    /**
     * A Zigbee route error command frame was received indicating that a message sent to this node along a many-to-one route failed en route.
     * The route error frame was delivered by an ad-hoc search for a functioning route.
     */
    MANY_TO_ONE_ROUTE_FAILURE = 170,
    /**
     * A critical and fatal error indicating that the version of the
     * stack trying to run does not match with the chip it's running on. The
     * software (stack) on the chip must be replaced with software
     * compatible with the chip.
     */
    STACK_AND_HARDWARE_MISMATCH = 176,
    /** An index was passed into the function that was larger than the valid range. */
    INDEX_OUT_OF_RANGE = 177,
    /** There are no empty entries left in the table. */
    TABLE_FULL = 180,
    /** The requested table entry has been erased and contains no valid data. */
    TABLE_ENTRY_ERASED = 182,
    /** The requested function cannot be executed because the library that contains the necessary functionality is not present. */
    LIBRARY_NOT_PRESENT = 181,
    /** The stack accepted the command and is currently processing the request. The results will be returned via an appropriate handler. */
    OPERATION_IN_PROGRESS = 186,
    /**
     * The EUI of the Trust center has changed due to a successful rejoin.
     * The device may need to perform other authentication to verify the new TC is authorized to take over.
     */
    TRUST_CENTER_EUI_HAS_CHANGED = 188,
    /** Trust center swapped out. The EUI has changed. */
    TRUST_CENTER_SWAPPED_OUT_EUI_HAS_CHANGED = 188,
    /** Trust center swapped out. The EUI has not changed. */
    TRUST_CENTER_SWAPPED_OUT_EUI_HAS_NOT_CHANGED = 191,
    /** NVM3 is telling the application that the initialization was aborted as no valid NVM3 page was found. */
    NVM3_TOKEN_NO_VALID_PAGES = 192,
    /** NVM3 is telling the application that the initialization was aborted as the NVM3 instance was already opened with other parameters. */
    NVM3_ERR_OPENED_WITH_OTHER_PARAMETERS = 193,
    /** NVM3 is telling the application that the initialization was aborted as the NVM3 instance is not aligned properly in memory. */
    NVM3_ERR_ALIGNMENT_INVALID = 194,
    /** NVM3 is telling the application that the initialization was aborted as the size of the NVM3 instance is too small. */
    NVM3_ERR_SIZE_TOO_SMALL = 195,
    /** NVM3 is telling the application that the initialization was aborted as the NVM3 page size is not supported. */
    NVM3_ERR_PAGE_SIZE_NOT_SUPPORTED = 196,
    /** NVM3 is telling the application that there was an error initializing some of the tokens. */
    NVM3_ERR_TOKEN_INIT = 197,
    /** NVM3 is telling the application there has been an error when attempting to upgrade SimEE tokens. */
    NVM3_ERR_UPGRADE = 198,
    /** NVM3 is telling the application that there has been an unknown error. */
    NVM3_ERR_UNKNOWN = 199,
    /**
     * This error is reserved for customer application use.
     *  This will never be returned from any portion of the network stack or HAL.
     */
    APPLICATION_ERROR_0 = 240,
    APPLICATION_ERROR_1 = 241,
    APPLICATION_ERROR_2 = 242,
    APPLICATION_ERROR_3 = 243,
    APPLICATION_ERROR_4 = 244,
    APPLICATION_ERROR_5 = 245,
    APPLICATION_ERROR_6 = 246,
    APPLICATION_ERROR_7 = 247,
    APPLICATION_ERROR_8 = 248,
    APPLICATION_ERROR_9 = 249,
    APPLICATION_ERROR_10 = 250,
    APPLICATION_ERROR_11 = 251,
    APPLICATION_ERROR_12 = 252,
    APPLICATION_ERROR_13 = 253,
    APPLICATION_ERROR_14 = 254,
    APPLICATION_ERROR_15 = 255
}
/** Status values used by EZSP. */
export declare enum EzspStatus {
    /** Success. */
    SUCCESS = 0,
    /** Fatal error. */
    SPI_ERR_FATAL = 16,
    /** The Response frame of the current transaction indicates the NCP has reset. */
    SPI_ERR_NCP_RESET = 17,
    /** The NCP is reporting that the Command frame of the current transaction is oversized (the length byte is too large). */
    SPI_ERR_OVERSIZED_EZSP_FRAME = 18,
    /** The Response frame of the current transaction indicates the previous transaction was aborted (nSSEL deasserted too soon). */
    SPI_ERR_ABORTED_TRANSACTION = 19,
    /** The Response frame of the current transaction indicates the frame terminator is missing from the Command frame. */
    SPI_ERR_MISSING_FRAME_TERMINATOR = 20,
    /** The NCP has not provided a Response within the time limit defined by WAIT_SECTION_TIMEOUT. */
    SPI_ERR_WAIT_SECTION_TIMEOUT = 21,
    /** The Response frame from the NCP is missing the frame terminator. */
    SPI_ERR_NO_FRAME_TERMINATOR = 22,
    /** The Host attempted to send an oversized Command (the length byte is too large) and the AVR's spi-protocol.c blocked the transmission. */
    SPI_ERR_EZSP_COMMAND_OVERSIZED = 23,
    /** The NCP attempted to send an oversized Response (the length byte is too large) and the AVR's spi-protocol.c blocked the reception. */
    SPI_ERR_EZSP_RESPONSE_OVERSIZED = 24,
    /** The Host has sent the Command and is still waiting for the NCP to send a Response. */
    SPI_WAITING_FOR_RESPONSE = 25,
    /** The NCP has not asserted nHOST_INT within the time limit defined by WAKE_HANDSHAKE_TIMEOUT. */
    SPI_ERR_HANDSHAKE_TIMEOUT = 26,
    /** The NCP has not asserted nHOST_INT after an NCP reset within the time limit defined by STARTUP_TIMEOUT. */
    SPI_ERR_STARTUP_TIMEOUT = 27,
    /** The Host attempted to verify the SPI Protocol activity and version number, and the verification failed. */
    SPI_ERR_STARTUP_FAIL = 28,
    /** The Host has sent a command with a SPI Byte that is unsupported by the current mode the NCP is operating in. */
    SPI_ERR_UNSUPPORTED_SPI_COMMAND = 29,
    /** Operation not yet complete. */
    ASH_IN_PROGRESS = 32,
    /** Fatal error detected by host. */
    HOST_FATAL_ERROR = 33,
    /** Fatal error detected by NCP. */
    ASH_NCP_FATAL_ERROR = 34,
    /** Tried to send DATA frame too long. */
    DATA_FRAME_TOO_LONG = 35,
    /** Tried to send DATA frame too short. */
    DATA_FRAME_TOO_SHORT = 36,
    /** No space for tx'ed DATA frame. */
    NO_TX_SPACE = 37,
    /** No space for rec'd DATA frame. */
    NO_RX_SPACE = 38,
    /** No receive data available. */
    NO_RX_DATA = 39,
    /** Not in Connected state. */
    NOT_CONNECTED = 40,
    /** The NCP received a command before the EZSP version had been set. */
    ERROR_VERSION_NOT_SET = 48,
    /** The NCP received a command containing an unsupported frame ID. */
    ERROR_INVALID_FRAME_ID = 49,
    /** The direction flag in the frame control field was incorrect. */
    ERROR_WRONG_DIRECTION = 50,
    /**
     * The truncated flag in the frame control field was set, indicating there was not enough memory available to
     * complete the response or that the response would have exceeded the maximum EZSP frame length.
     */
    ERROR_TRUNCATED = 51,
    /**
     * The overflow flag in the frame control field was set, indicating one or more callbacks occurred since the previous
     * response and there was not enough memory available to report them to the Host.
     */
    ERROR_OVERFLOW = 52,
    /** Insufficient memory was available. */
    ERROR_OUT_OF_MEMORY = 53,
    /** The value was out of bounds. */
    ERROR_INVALID_VALUE = 54,
    /** The configuration id was not recognized. */
    ERROR_INVALID_ID = 55,
    /** Configuration values can no longer be modified. */
    ERROR_INVALID_CALL = 56,
    /** The NCP failed to respond to a command. */
    ERROR_NO_RESPONSE = 57,
    /** The length of the command exceeded the maximum EZSP frame length. */
    ERROR_COMMAND_TOO_LONG = 64,
    /** The UART receive queue was full causing a callback response to be dropped. */
    ERROR_QUEUE_FULL = 65,
    /** The command has been filtered out by NCP. */
    ERROR_COMMAND_FILTERED = 66,
    /** EZSP Security Key is already set */
    ERROR_SECURITY_KEY_ALREADY_SET = 67,
    /** EZSP Security Type is invalid */
    ERROR_SECURITY_TYPE_INVALID = 68,
    /** EZSP Security Parameters are invalid */
    ERROR_SECURITY_PARAMETERS_INVALID = 69,
    /** EZSP Security Parameters are already set */
    ERROR_SECURITY_PARAMETERS_ALREADY_SET = 70,
    /** EZSP Security Key is not set */
    ERROR_SECURITY_KEY_NOT_SET = 71,
    /** EZSP Security Parameters are not set */
    ERROR_SECURITY_PARAMETERS_NOT_SET = 72,
    /** Received frame with unsupported control byte */
    ERROR_UNSUPPORTED_CONTROL = 73,
    /** Received frame is unsecure, when security is established */
    ERROR_UNSECURE_FRAME = 74,
    /** Incompatible ASH version */
    ASH_ERROR_VERSION = 80,
    /** Exceeded max ACK timeouts */
    ASH_ERROR_TIMEOUTS = 81,
    /** Timed out waiting for RSTACK */
    ASH_ERROR_RESET_FAIL = 82,
    /** Unexpected ncp reset */
    ASH_ERROR_NCP_RESET = 83,
    /** Serial port initialization failed */
    ERROR_SERIAL_INIT = 84,
    /** Invalid ncp processor type */
    ASH_ERROR_NCP_TYPE = 85,
    /** Invalid ncp reset method */
    ASH_ERROR_RESET_METHOD = 86,
    /** XON/XOFF not supported by host driver */
    ASH_ERROR_XON_XOFF = 87,
    /** ASH protocol started */
    ASH_STARTED = 112,
    /** ASH protocol connected */
    ASH_CONNECTED = 113,
    /** ASH protocol disconnected */
    ASH_DISCONNECTED = 114,
    /** Timer expired waiting for ack */
    ASH_ACK_TIMEOUT = 115,
    /** Frame in progress cancelled */
    ASH_CANCELLED = 116,
    /** Received frame out of sequence */
    ASH_OUT_OF_SEQUENCE = 117,
    /** Received frame with CRC error */
    ASH_BAD_CRC = 118,
    /** Received frame with comm error */
    ASH_COMM_ERROR = 119,
    /** Received frame with bad ackNum */
    ASH_BAD_ACKNUM = 120,
    /** Received frame shorter than minimum */
    ASH_TOO_SHORT = 121,
    /** Received frame longer than maximum */
    ASH_TOO_LONG = 122,
    /** Received frame with illegal control byte */
    ASH_BAD_CONTROL = 123,
    /** Received frame with illegal length for its type */
    ASH_BAD_LENGTH = 124,
    /** Received ASH Ack */
    ASH_ACK_RECEIVED = 125,
    /** Sent ASH Ack */
    ASH_ACK_SENT = 126,
    /** Received ASH Nak */
    ASH_NAK_RECEIVED = 127,
    /** Sent ASH Nak */
    ASH_NAK_SENT = 128,
    /** Received ASH RST */
    ASH_RST_RECEIVED = 129,
    /** Sent ASH RST */
    ASH_RST_SENT = 130,
    /** ASH Status */
    ASH_STATUS = 131,
    /** ASH TX */
    ASH_TX = 132,
    /** ASH RX */
    ASH_RX = 133,
    /** Failed to connect to CPC daemon or failed to open CPC endpoint */
    CPC_ERROR_INIT = 134,
    /** No reset or error */
    NO_ERROR = 255
}
export declare enum EmberStackError {
    ROUTE_ERROR_NO_ROUTE_AVAILABLE = 0,
    ROUTE_ERROR_TREE_LINK_FAILURE = 1,
    ROUTE_ERROR_NON_TREE_LINK_FAILURE = 2,
    ROUTE_ERROR_LOW_BATTERY_LEVEL = 3,
    ROUTE_ERROR_NO_ROUTING_CAPACITY = 4,
    ROUTE_ERROR_NO_INDIRECT_CAPACITY = 5,
    ROUTE_ERROR_INDIRECT_TRANSACTION_EXPIRY = 6,
    ROUTE_ERROR_TARGET_DEVICE_UNAVAILABLE = 7,
    ROUTE_ERROR_TARGET_ADDRESS_UNALLOCATED = 8,
    ROUTE_ERROR_PARENT_LINK_FAILURE = 9,
    ROUTE_ERROR_VALIDATE_ROUTE = 10,
    ROUTE_ERROR_SOURCE_ROUTE_FAILURE = 11,
    ROUTE_ERROR_MANY_TO_ONE_ROUTE_FAILURE = 12,
    ROUTE_ERROR_ADDRESS_CONFLICT = 13,
    ROUTE_ERROR_VERIFY_ADDRESSES = 14,
    ROUTE_ERROR_PAN_IDENTIFIER_UPDATE = 15,
    NETWORK_STATUS_NETWORK_ADDRESS_UPDATE = 16,
    NETWORK_STATUS_BAD_FRAME_COUNTER = 17,
    NETWORK_STATUS_BAD_KEY_SEQUENCE_NUMBER = 18,
    NETWORK_STATUS_UNKNOWN_COMMAND = 19
}
/** Type of Ember software version */
export declare enum EmberVersionType {
    PRE_RELEASE = 0,
    ALPHA_1 = 17,
    ALPHA_2 = 18,
    ALPHA_3 = 19,
    BETA_1 = 33,
    BETA_2 = 34,
    BETA_3 = 35,
    GA = 170
}
export declare enum EmberLeaveRequestFlags {
    /** Leave and rejoin. */
    AND_REJOIN = 128,
    /** Leave. */
    WITHOUT_REJOIN = 0
}
/**
 * For emberSetTxPowerMode and mfglibSetPower.
 * uint16_t
 */
export declare enum EmberTXPowerMode {
    /**
     * The application should call ::emberSetTxPowerMode() with the
     * txPowerMode parameter set to this value to disable all power mode options,
     * resulting in normal power mode and bi-directional RF transmitter output.
     */
    DEFAULT = 0,
    /**
     * The application should call ::emberSetTxPowerMode() with the
     * txPowerMode parameter set to this value to enable boost power mode.
     */
    BOOST = 1,
    /**
     * The application should call ::emberSetTxPowerMode() with the
     * txPowerMode parameter set to this value to enable the alternate transmitter
     * output.
     */
    ALTERNATE = 2,
    /**
     * The application should call ::emberSetTxPowerMode() with the
     * txPowerMode parameter set to this value to enable both boost mode and the
     * alternate transmitter output.
     */
    BOOST_AND_ALTERNATE = 3,// (BOOST | ALTERNATE)
    USE_TOKEN = 32768
}
/** uint8_t */
export declare enum EmberKeepAliveMode {
    KEEP_ALIVE_SUPPORT_UNKNOWN = 0,
    MAC_DATA_POLL_KEEP_ALIVE = 1,
    END_DEVICE_TIMEOUT_KEEP_ALIVE = 2,
    KEEP_ALIVE_SUPPORT_ALL = 3
}
/** This is the Extended Security Bitmask that controls the use of various extended security features. */
export declare enum EmberExtendedSecurityBitmask {
    /**
     * If this bit is set, the 'key token data' field is set in the Initial Security Bitmask to 0 (No Preconfig Key token).
     * Otherwise, the field is left as is.
     */
    PRECONFIG_KEY_NOT_VALID = 1,
    /**
     * This denotes that the network key update can only happen if the network key update request is unicast and encrypted
     * i.e. broadcast network key update requests will not be processed if bit 1 is set
     */
    SECURE_NETWORK_KEY_ROTATION = 2,
    /** This denotes whether a joiner node (router or end-device) uses a Global Link Key or a Unique Link Key. */
    JOINER_GLOBAL_LINK_KEY = 16,
    /**
     * This denotes whether the device's outgoing frame counter is allowed to be reset during forming or joining.
     * If the flag is set, the outgoing frame counter is not allowed to be reset.
     * If the flag is not set, the frame counter is allowed to be reset.
     */
    EXT_NO_FRAME_COUNTER_RESET = 32,
    /** This denotes whether a device should discard or accept network leave without rejoin commands. */
    NWK_LEAVE_WITHOUT_REJOIN_NOT_ALLOWED = 64,
    /** This denotes whether a router node should discard or accept network Leave Commands. */
    NWK_LEAVE_REQUEST_NOT_ALLOWED = 256,
    /**
     * This denotes whether a node is running the latest stack specification or is emulating R18 specs behavior.
     * If this flag is enabled, a router node should only send encrypted Update Device messages while the TC
     * should only accept encrypted Updated Device messages.
     */
    R18_STACK_BEHAVIOR = 512,
    ZDO_LEAVE_FROM_NON_PARENT_NOT_ALLOWED = 4096
}
/** This is the Initial Security Bitmask that controls the use of various security features. */
export declare enum EmberInitialSecurityBitmask {
    /** Enables Distributed Trust Center Mode for the device forming the network. (Previously known as ::EMBER_NO_TRUST_CENTER_MODE) */
    DISTRIBUTED_TRUST_CENTER_MODE = 2,
    /** Enables a Global Link Key for the Trust Center. All nodes will share the same Trust Center Link Key. */
    TRUST_CENTER_GLOBAL_LINK_KEY = 4,
    /** Enables devices that perform MAC Association with a pre-configured Network Key to join the network. It is only set on the Trust Center. */
    PRECONFIGURED_NETWORK_KEY_MODE = 8,
    HAVE_TRUST_CENTER_UNKNOWN_KEY_TOKEN = 16,
    HAVE_TRUST_CENTER_LINK_KEY_TOKEN = 32,
    /**
     * This denotes that the ::EmberInitialSecurityState::preconfiguredTrustCenterEui64 has a value in it containing the trust center EUI64.
     * The device will only join a network and accept commands from a trust center with that EUI64.
     * Normally this bit is NOT set and the EUI64 of the trust center is learned during the join process.
     * When commissioning a device to join onto an existing network that is using a trust center and without sending any messages,
     * this bit must be set and the field ::EmberInitialSecurityState::preconfiguredTrustCenterEui64 must be populated with the appropriate EUI64.
    */
    HAVE_TRUST_CENTER_EUI64 = 64,
    /**
     * This denotes that the ::EmberInitialSecurityState::preconfiguredKey is not the actual Link Key but a Root Key known only to the Trust Center.
     * It is hashed with the IEEE Address of the destination device to create the actual Link Key used in encryption.
     * This is bit is only used by the Trust Center. The joining device need not set this.
    */
    TRUST_CENTER_USES_HASHED_LINK_KEY = 132,
    /**
     * This denotes that the ::EmberInitialSecurityState::preconfiguredKey element has valid data that should be used to configure
     * the initial security state.
     */
    HAVE_PRECONFIGURED_KEY = 256,
    /**
     * This denotes that the ::EmberInitialSecurityState::networkKey element has valid data that should be used to configure
     * the initial security state.
     */
    HAVE_NETWORK_KEY = 512,
    /**
     * This denotes to a joining node that it should attempt to acquire a Trust Center Link Key during joining.
     * This is necessary if the device does not have a pre-configured key, or wants to obtain a new one
     * (since it may be using a well-known key during joining).
     */
    GET_LINK_KEY_WHEN_JOINING = 1024,
    /**
     * This denotes that a joining device should only accept an encrypted network key from the Trust Center (using its pre-configured key).
     * A key sent in-the-clear by the Trust Center will be rejected and the join will fail.
     * This option is only valid when using a pre-configured key.
     */
    REQUIRE_ENCRYPTED_KEY = 2048,
    /**
     * This denotes whether the device should NOT reset its outgoing frame counters (both NWK and APS) when
     * ::emberSetInitialSecurityState() is called.
     * Normally it is advised to reset the frame counter before joining a new network.
     * However, when a device is joining to the same network again (but not using ::emberRejoinNetwork()),
     * it should keep the NWK and APS frame counters stored in its tokens.
     *
     * NOTE: The application is allowed to dynamically change the behavior via EMBER_EXT_NO_FRAME_COUNTER_RESET field.
     */
    NO_FRAME_COUNTER_RESET = 4096,
    /**
     * This denotes that the device should obtain its pre-configured key from an installation code stored in the manufacturing token.
     * The token contains a value that will be hashed to obtain the actual pre-configured key.
     * If that token is not valid, the call to ::emberSetInitialSecurityState() will fail.
     */
    GET_PRECONFIGURED_KEY_FROM_INSTALL_CODE = 8192,
    EM_SAVED_IN_TOKEN = 16384
}
/** Either marks an event as inactive or specifies the units for the event execution time. uint8_t */
export declare enum EmberEventUnits {
    /** The event is not scheduled to run. */
    INACTIVE = 0,
    /** The execution time is in approximate milliseconds.  */
    MS_TIME = 1,
    /** The execution time is in 'binary' quarter seconds (256 approximate milliseconds each). */
    QS_TIME = 2,
    /** The execution time is in 'binary' minutes (65536 approximate milliseconds each). */
    MINUTE_TIME = 3,
    /** The event is scheduled to run at the earliest opportunity. */
    ZERO_DELAY = 4
}
/**
 * Defines the events reported to the application by the ::emberCounterHandler().
 * Usage of the destinationNodeId or data fields found in the EmberCounterInfo or EmberExtraCounterInfo
 * structs is denoted for counter types that use them.
 * (See comments accompanying enum definitions in this source file for details.)
 */
export declare enum EmberCounterType {
    /**
     * The MAC received a broadcast Data frame, Command frame, or Beacon.
     * - destinationNodeId: BROADCAST_ADDRESS or Data frames or sender node ID for Beacon frames
     * - data: not used
     */
    MAC_RX_BROADCAST = 0,
    /**
     * The MAC transmitted a broadcast Data frame, Command frame or Beacon.
     * - destinationNodeId: BROADCAST_ADDRESS
     * - data: not used
     */
    MAC_TX_BROADCAST = 1,
    /**
     * The MAC received a unicast Data or Command frame.
     * - destinationNodeId: MAC layer source or EMBER_UNKNOWN_NODE_ID if no 16-bit source node ID is present in the frame
     * - data: not used
     */
    MAC_RX_UNICAST = 2,
    /**
     * The MAC successfully transmitted a unicast Data or Command frame.
     *   Note: Only frames with a 16-bit destination node ID are counted.
     * - destinationNodeId: MAC layer destination address
     * - data: not used
     */
    MAC_TX_UNICAST_SUCCESS = 3,
    /**
     * The MAC retried a unicast Data or Command frame after initial Tx attempt.
     *   Note: CSMA-related failures are tracked separately via PHY_CCA_FAIL_COUNT.
     * - destinationNodeId: MAC layer destination or EMBER_UNKNOWN_NODE_ID if no 16-bit destination node ID is present in the frame
     * - data: number of retries (after initial Tx attempt) accumulated so far for this packet. (Should always be >0.)
     */
    MAC_TX_UNICAST_RETRY = 4,
    /**
     * The MAC unsuccessfully transmitted a unicast Data or Command frame.
     *   Note: Only frames with a 16-bit destination node ID are counted.
     * - destinationNodeId: MAC layer destination address
     * - data: not used
     */
    MAC_TX_UNICAST_FAILED = 5,
    /**
     * The APS layer received a data broadcast.
     * - destinationNodeId: sender's node ID
     * - data: not used
     */
    APS_DATA_RX_BROADCAST = 6,
    /** The APS layer transmitted a data broadcast. */
    APS_DATA_TX_BROADCAST = 7,
    /**
     * The APS layer received a data unicast.
     * - destinationNodeId: sender's node ID
     * - data: not used
     */
    APS_DATA_RX_UNICAST = 8,
    /**
     * The APS layer successfully transmitted a data unicast.
     * - destinationNodeId: NWK destination address
     * - data: number of APS retries (>=0) consumed for this unicast.
     */
    APS_DATA_TX_UNICAST_SUCCESS = 9,
    /**
     * The APS layer retried a unicast Data frame.
     * This is a placeholder and is not used by the @c ::emberCounterHandler() callback.
     * Instead, the number of APS retries are returned in the data parameter of the callback
     * for the @c ::APS_DATA_TX_UNICAST_SUCCESS and @c ::APS_DATA_TX_UNICAST_FAILED types.
     * However, our supplied Counters component code will attempt to collect this information
     * from the aforementioned counters and populate this counter.
     * Note that this counter's behavior differs from that of @c ::MAC_TX_UNICAST_RETRY .
     */
    APS_DATA_TX_UNICAST_RETRY = 10,
    /**
     * The APS layer unsuccessfully transmitted a data unicast.
     * - destinationNodeId: NWK destination address
     * - data: number of APS retries (>=0) consumed for this unicast.
     */
    APS_DATA_TX_UNICAST_FAILED = 11,
    /** The network layer successfully submitted a new route discovery to the MAC. */
    ROUTE_DISCOVERY_INITIATED = 12,
    /** An entry was added to the neighbor table. */
    NEIGHBOR_ADDED = 13,
    /** An entry was removed from the neighbor table. */
    NEIGHBOR_REMOVED = 14,
    /** A neighbor table entry became stale because it had not been heard from. */
    NEIGHBOR_STALE = 15,
    /**
     * A node joined or rejoined to the network via this node.
     * - destinationNodeId: node ID of child
     * - data: not used
     */
    JOIN_INDICATION = 16,
    /**
     * An entry was removed from the child table.
     * - destinationNodeId: node ID of child
     * - data: not used
     */
    CHILD_REMOVED = 17,
    /** EZSP-UART only. An overflow error occurred in the UART. */
    ASH_OVERFLOW_ERROR = 18,
    /** EZSP-UART only. A framing error occurred in the UART. */
    ASH_FRAMING_ERROR = 19,
    /** EZSP-UART only. An overrun error occurred in the UART. */
    ASH_OVERRUN_ERROR = 20,
    /** A message was dropped at the Network layer because the NWK frame counter was not higher than the last message seen from that source. */
    NWK_FRAME_COUNTER_FAILURE = 21,
    /**
     * A message was dropped at the APS layer because the APS frame counter was not higher than the last message seen from that source.
     * - destinationNodeId: node ID of MAC source that relayed the message
     * - data: not used
     */
    APS_FRAME_COUNTER_FAILURE = 22,
    /** EZSP-UART only. An XOFF was transmitted by the UART. */
    ASH_XOFF = 23,
    /**
     * An encrypted message was dropped by the APS layer because the sender's key has not been authenticated.
     * As a result, the key is not authorized for use in APS data messages.
     * - destinationNodeId: EMBER_NULL_NODE_ID
     * - data: APS key table index related to the sender
     */
    APS_LINK_KEY_NOT_AUTHORIZED = 24,
    /**
     * A NWK encrypted message was received but dropped because decryption failed.
     * - destinationNodeId: sender of the dropped packet
     * - data: not used
     */
    NWK_DECRYPTION_FAILURE = 25,
    /**
     * An APS encrypted message was received but dropped because decryption failed.
     * - destinationNodeId: sender of the dropped packet
     * - data: not used
     */
    APS_DECRYPTION_FAILURE = 26,
    /**
     * The number of failures to allocate a set of linked packet buffers.
     * This doesn't necessarily mean that the packet buffer count was 0 at the time,
     * but that the number requested was greater than the number free.
     */
    ALLOCATE_PACKET_BUFFER_FAILURE = 27,
    /**
     * The number of relayed unicast packets.
     * - destinationId: NWK layer destination address of relayed packet
     * - data: not used
     */
    RELAYED_UNICAST = 28,
    /**
     * The number of times a packet was dropped due to reaching the preset PHY-to-MAC queue limit (sli_mac_phy_to_mac_queue_length).
     * The limit will determine how many messages are accepted by the PHY between calls to emberTick().
     * After that limit is reached, packets will be dropped. The counter records the number of dropped packets.
     *
     * NOTE: For each call to emberCounterHandler() there may be more than 1 packet that was dropped due to the limit reached.
     * The actual number of packets dropped will be returned in the 'data' parameter passed to that function.
     *
     * - destinationNodeId: not used
     * - data: number of dropped packets represented by this counter event
     * - phyIndex: present
     */
    PHY_TO_MAC_QUEUE_LIMIT_REACHED = 29,
    /**
     * The number of times a packet was dropped due to the packet-validate library checking a packet
     * and rejecting it due to length or other formatting problems.
     * - destinationNodeId: not used
     * - data: type of validation condition that failed
     */
    PACKET_VALIDATE_LIBRARY_DROPPED_COUNT = 30,
    /**
     * The number of times the NWK retry queue is full and a new message failed to be added.
     * - destinationNodeId; not used
     * - data: NWK retry queue size that has been exceeded
     */
    TYPE_NWK_RETRY_OVERFLOW = 31,
    /**
     * The number of times the PHY layer was unable to transmit due to a failed CCA (Clear Channel Assessment) attempt.
     * See also: MAC_TX_UNICAST_RETRY.
     * - destinationNodeId: MAC layer destination or EMBER_UNKNOWN_NODE_ID if no 16-bit destination node ID is present in the frame
     * - data: not used
     */
    PHY_CCA_FAIL_COUNT = 32,
    /** The number of times a NWK broadcast was dropped because the broadcast table was full. */
    BROADCAST_TABLE_FULL = 33,
    /** The number of times a low-priority packet traffic arbitration request has been made. */
    PTA_LO_PRI_REQUESTED = 34,
    /** The number of times a high-priority packet traffic arbitration request has been made. */
    PTA_HI_PRI_REQUESTED = 35,
    /** The number of times a low-priority packet traffic arbitration request has been denied. */
    PTA_LO_PRI_DENIED = 36,
    /** The number of times a high-priority packet traffic arbitration request has been denied. */
    PTA_HI_PRI_DENIED = 37,
    /** The number of times a low-priority packet traffic arbitration transmission has been aborted. */
    PTA_LO_PRI_TX_ABORTED = 38,
    /** The number of times a high-priority packet traffic arbitration transmission has been aborted. */
    PTA_HI_PRI_TX_ABORTED = 39,
    /** The number of times an address conflict has caused node_id change, and an address conflict error is sent. */
    ADDRESS_CONFLICT_SENT = 40,
    /** A placeholder giving the number of Ember counter types. */
    COUNT = 41
}
/** An enumerated list of library identifiers. */
export declare enum EmberLibraryId {
    FIRST = 0,
    ZIGBEE_PRO = 0,
    BINDING = 1,
    END_DEVICE_BIND = 2,
    SECURITY_CORE = 3,
    SECURITY_LINK_KEYS = 4,
    ALARM = 5,
    CBKE = 6,
    CBKE_DSA_SIGN = 7,
    ECC = 8,
    CBKE_DSA_VERIFY = 9,
    PACKET_VALIDATE = 10,
    INSTALL_CODE = 11,
    ZLL = 12,
    CBKE_283K1 = 13,
    ECC_283K1 = 14,
    CBKE_CORE = 15,
    NCP = 16,
    MULTI_NETWORK = 17,
    ENHANCED_BEACON_REQUEST = 18,
    CBKE_283K1_DSA_VERIFY = 19,
    MULTI_PAN = 20,
    NUMBER_OF_LIBRARIES = 21,
    NULL = 255
}
/** This indicates the presence, absence, or status of an Ember stack library. */
export declare enum EmberLibraryStatus {
    LIBRARY_PRESENT_MASK = 128,
    LIBRARY_IS_STUB = 0,
    LIBRARY_ERROR = 255,
    /** no router capability */
    ZIGBEE_PRO_LIBRARY_END_DEVICE_ONLY = 0,
    ZIGBEE_PRO_LIBRARY_HAVE_ROUTER_CAPABILITY = 1,
    ZIGBEE_PRO_LIBRARY_ZLL_SUPPORT = 2,
    SECURITY_LIBRARY_END_DEVICE_ONLY = 0,
    /** router or trust center support */
    SECURITY_LIBRARY_HAVE_ROUTER_SUPPORT = 1,
    PACKET_VALIDATE_LIBRARY_DISABLED = 0,
    PACKET_VALIDATE_LIBRARY_ENABLED = 1,
    PACKET_VALIDATE_LIBRARY_ENABLE_MASK = 1
}
/** Defines the entropy source used by the stack. */
export declare enum EmberEntropySource {
    /** Error in identifying the entropy source. */
    ERROR = 0,
    /** The default radio entropy source. */
    RADIO = 1,
    /** TRNG with mbed TLS support. */
    MBEDTLS_TRNG = 2,
    /** Other mbed TLS entropy source. */
    MBEDTLS = 3
}
/** Defines the options that should be used when initializing the node's network configuration. */
export declare enum EmberNetworkInitBitmask {
    NO_OPTIONS = 0,
    /** The Parent Node ID and EUI64 are stored in a token. This prevents the need to perform an Orphan scan on startup. */
    PARENT_INFO_IN_TOKEN = 1,
    /** Z3 compliant end devices on a network must send a rejoin request on reboot. */
    END_DEVICE_REJOIN_ON_REBOOT = 2
}
/** Defines the possible join states for a node. uint8_t */
export declare enum EmberNetworkStatus {
    /** The node is not associated with a network in any way. */
    NO_NETWORK = 0,
    /** The node is currently attempting to join a network. */
    JOINING_NETWORK = 1,
    /** The node is joined to a network. */
    JOINED_NETWORK = 2,
    /** The node is an end device joined to a network but its parent is not responding. */
    JOINED_NETWORK_NO_PARENT = 3,
    /** The node is a Sleepy-to-Sleepy initiator */
    JOINED_NETWORK_S2S_INITIATOR = 4,
    /** The node is a Sleepy-to-Sleepy target */
    JOINED_NETWORK_S2S_TARGET = 5,
    /** The node is in the process of leaving its current network. */
    LEAVING_NETWORK = 6
}
/** Network scan types. */
export declare enum EzspNetworkScanType {
    /** An energy scan scans each channel for its RSSI value. */
    ENERGY_SCAN = 0,
    /** An active scan scans each channel for available networks. */
    ACTIVE_SCAN = 1
}
/** The type of method used for joining. uint8_t */
export declare enum EmberJoinMethod {
    /** Devices normally use MAC association to join a network, which respects
     *  the "permit joining" flag in the MAC beacon.
     *  This value should be used by default.
     */
    MAC_ASSOCIATION = 0,
    /** For networks where the "permit joining" flag is never turned
     *  on, devices will need to use a ZigBee NWK Rejoin.  This value causes the
     *  rejoin to be sent withOUT NWK security and the Trust Center will be
     *  asked to send the NWK key to the device.  The NWK key sent to the device
     *  can be encrypted with the device's corresponding Trust Center link key.
     *  That is determined by the ::EmberJoinDecision on the Trust Center
     *  returned by the ::emberTrustCenterJoinHandler().
     */
    NWK_REJOIN = 1,
    NWK_REJOIN_HAVE_NWK_KEY = 2,
    /** For networks where all network and security information is known
         ahead of time, a router device may be commissioned such that it does
        not need to send any messages to begin communicating on the network.
    */
    CONFIGURED_NWK_STATE = 3,
    /** This enumeration causes an unencrypted Network Commissioning Request to be
         sent out with joinType set to initial join. The trust center may respond
        by establishing a new dynamic link key and then sending the network key.
        Network Commissioning Requests should only be sent to parents that support
        processing of the command.
    */
    NWK_COMMISSIONING_JOIN = 4,
    /** This enumeration causes an unencrypted Network Commissioning Request to be
         sent out with joinType set to rejoin. The trust center may respond
        by establishing a new dynamic link key and then sending the network key.
        Network Commissioning Requests should only be sent to parents that support
        processing of the command.
    */
    NWK_COMMISSIONING_REJOIN = 5,
    /** This enumeration causes an encrypted Network Commissioning Request to be
         sent out with joinType set to rejoin. This enumeration is used by devices
        that already have the network key and wish to recover connection to a
        parent or the network in general.
        Network Commissioning Requests should only be sent to parents that support
        processing of the command.
    */
    NWK_COMMISSIONING_REJOIN_HAVE_NWK_KEY = 6
}
/** Defines the possible types of nodes and the roles that a node might play in a network. */
export declare enum EmberNodeType {
    /** The device is not joined. */
    UNKNOWN_DEVICE = 0,
    /** Will relay messages and can act as a parent to other nodes. */
    COORDINATOR = 1,
    /** Will relay messages and can act as a parent to other nodes. */
    ROUTER = 2,
    /** Communicates only with its parent and will not relay messages. */
    END_DEVICE = 3,
    /** An end device whose radio can be turned off to save power. The application must call ::emberPollForData() to receive messages. */
    SLEEPY_END_DEVICE = 4,
    /** Sleepy end device which transmits with wake up frames (CSL). */
    S2S_INITIATOR_DEVICE = 5,
    /** Sleepy end device which duty cycles the radio Rx (CSL). */
    S2S_TARGET_DEVICE = 6
}
/**  */
export declare enum EmberMultiPhyNwkConfig {
    ROUTERS_ALLOWED = 1,
    BROADCASTS_ENABLED = 2,
    DISABLED = 128
}
/**
 * Duty cycle states
 *
 * Applications have no control over the state but the callback exposes
 * state changes to the application.
 */
export declare enum EmberDutyCycleState {
    /** No duty cycle tracking or metrics are taking place. */
    TRACKING_OFF = 0,
    /** Duty Cycle is tracked and has not exceeded any thresholds. */
    LBT_NORMAL = 1,
    /** The limited threshold of the total duty cycle allotment was exceeded. */
    LBT_LIMITED_THRESHOLD_REACHED = 2,
    /** The critical threshold of the total duty cycle allotment was exceeded. */
    LBT_CRITICAL_THRESHOLD_REACHED = 3,
    /** The suspend limit was reached and all outbound transmissions are blocked. */
    LBT_SUSPEND_LIMIT_REACHED = 4
}
/** Defines binding types. uint8_t */
export declare enum EmberBindingType {
    /** A binding that is currently not in use. */
    UNUSED_BINDING = 0,
    /** A unicast binding whose 64-bit identifier is the destination EUI64. */
    UNICAST_BINDING = 1,
    /**
     * A unicast binding whose 64-bit identifier is the many-to-one destination EUI64.
     * Route discovery should be disabled when sending unicasts via many-to-one bindings.
     */
    MANY_TO_ONE_BINDING = 2,
    /**
     * A multicast binding whose 64-bit identifier is the group address.
     * This binding can be used to send messages to the group and to receive messages sent to the group.
     */
    MULTICAST_BINDING = 3
}
/** Defines the possible outgoing message types. uint8_t */
export declare enum EmberOutgoingMessageType {
    /** Unicast sent directly to an EmberNodeId. */
    DIRECT = 0,
    /** Unicast sent using an entry in the address table. */
    VIA_ADDRESS_TABLE = 1,
    /** Unicast sent using an entry in the binding table. */
    VIA_BINDING = 2,
    /** Multicast message. This value is passed to emberMessageSentHandler() only. It may not be passed to emberSendUnicast(). */
    MULTICAST = 3,
    /** An aliased multicast message. This value is passed to emberMessageSentHandler() only. It may not be passed to emberSendUnicast(). */
    MULTICAST_WITH_ALIAS = 4,
    /** An aliased Broadcast message. This value is passed to emberMessageSentHandler() only. It may not be passed to emberSendUnicast(). */
    BROADCAST_WITH_ALIAS = 5,
    /** A broadcast message. This value is passed to emberMessageSentHandler() only. It may not be passed to emberSendUnicast(). */
    BROADCAST = 6
}
/** Defines the possible incoming message types. uint8_t */
export declare enum EmberIncomingMessageType {
    /** Unicast. */
    UNICAST = 0,
    /** Unicast reply. */
    UNICAST_REPLY = 1,
    /** Multicast. */
    MULTICAST = 2,
    /** Multicast sent by the local device. */
    MULTICAST_LOOPBACK = 3,
    /** Broadcast. */
    BROADCAST = 4,
    /** Broadcast sent by the local device. */
    BROADCAST_LOOPBACK = 5
}
/**
 * Options to use when sending a message.
 *
 * The discover-route, APS-retry, and APS-indirect options may be used together.
 * Poll response cannot be combined with any other options.
 * uint16_t
 */
export declare enum EmberApsOption {
    /** No options. */
    NONE = 0,
    ENCRYPT_WITH_TRANSIENT_KEY = 1,
    USE_ALIAS_SEQUENCE_NUMBER = 2,
    /**
     * This signs the application layer message body (APS Frame not included) and appends the ECDSA signature to the end of the message,
     * which is needed by Smart Energy applications and requires the CBKE and ECC libraries.
     * The ::emberDsaSignHandler() function is called after DSA signing is complete but before the message has been sent by the APS layer.
     * Note that when passing a buffer to the stack for DSA signing, the final byte in the buffer has a special significance as an indicator
     * of how many leading bytes should be ignored for signature purposes. See the API documentation of emberDsaSign()
     * or the dsaSign EZSP command for more details about this requirement.
     */
    DSA_SIGN = 16,
    /** Send the message using APS Encryption using the Link Key shared with the destination node to encrypt the data at the APS Level. */
    ENCRYPTION = 32,
    /**
     * Resend the message using the APS retry mechanism.
     * This option and the enable route discovery option must be enabled for an existing route to be repaired automatically.
     */
    RETRY = 64,
    /**
     * Send the message with the NWK 'enable route discovery' flag, which  causes a route discovery to be initiated if no route to the
     * destination is known. Note that in the mesh stack, this option and the APS retry option must be enabled an existing route to be
     * repaired automatically.
     */
    ENABLE_ROUTE_DISCOVERY = 256,
    /** Send the message with the NWK 'force route discovery' flag, which causes a route discovery to be initiated even if one is known. */
    FORCE_ROUTE_DISCOVERY = 512,
    /** Include the source EUI64 in the network frame. */
    SOURCE_EUI64 = 1024,
    /** Include the destination EUI64 in the network frame. */
    DESTINATION_EUI64 = 2048,
    /** Send a ZDO request to discover the node ID of the destination if it is not already known. */
    ENABLE_ADDRESS_DISCOVERY = 4096,
    /**
     * This message is being sent in response to a call to  ::emberPollHandler().
     * It causes the message to be sent immediately instead of being queued up until the next poll from the (end device) destination.
     */
    POLL_RESPONSE = 8192,
    /**
     * This incoming message is a valid ZDO request and the application is responsible for sending a ZDO response.
     * This flag is used only within emberIncomingMessageHandler() when EMBER_APPLICATION_RECEIVES_UNSUPPORTED_ZDO_REQUESTS is defined. */
    ZDO_RESPONSE_REQUIRED = 16384,
    /**
     * This message is part of a fragmented message.  This option may only  be set for unicasts.
     * The groupId field gives the index of this fragment in the low-order byte.
     * If the low-order byte is zero this is the first fragment and the high-order byte contains the number of fragments in the message.
     */
    FRAGMENT = 32768
}
/**
 * Types of source route discovery modes used by the concentrator.
 *
 * OFF no source route discovery is scheduled
 *
 * ON source routes discovery is scheduled, and it is triggered periodically
 *
 * RESCHEDULE  source routes discoveries are re-scheduled to be sent once immediately and then triggered periodically
 */
export declare enum EmberSourceRouteDiscoveryMode {
    /** off  */
    OFF = 0,
    /** on  */
    ON = 1,
    /** reschedule */
    RESCHEDULE = 2
}
/** The types of MAC passthrough messages that an application may receive. This is a bitmask. */
export declare enum EmberMacPassthroughType {
    /** No MAC passthrough messages. */
    NONE = 0,
    /** SE InterPAN messages. */
    SE_INTERPAN = 1,
    /** EmberNet and first generation (v1) standalone bootloader messages. */
    EMBERNET = 2,
    /** EmberNet messages filtered by their source address. */
    EMBERNET_SOURCE = 4,
    /** Application-specific passthrough messages. */
    APPLICATION = 8,
    /** Custom inter-pan filter. */
    CUSTOM = 16,
    /** Internal Stack passthrough. */
    INTERNAL_ZLL = 128,
    INTERNAL_GP = 64
}
/**
 * Interpan Message type: unicast, broadcast, or multicast.
 * uint8_t
 */
export declare enum EmberInterpanMessageType {
    UNICAST = 0,
    BROADCAST = 8,
    MULTICAST = 12
}
/** This is the Current Security Bitmask that details the use of various security features. */
export declare enum EmberCurrentSecurityBitmask {
    /** This denotes that the device is running in a network with ZigBee
     *  Standard Security. */
    STANDARD_SECURITY_MODE_ = 0,
    /** This denotes that the device is running in a network without
     *  a centralized Trust Center. */
    DISTRIBUTED_TRUST_CENTER_MODE_ = 2,
    /** This denotes that the device has a Global Link Key.  The Trust Center
     *  Link Key is the same across multiple nodes. */
    TRUST_CENTER_GLOBAL_LINK_KEY_ = 4,
    /** This denotes that the node has a Trust Center Link Key. */
    HAVE_TRUST_CENTER_LINK_KEY = 16,
    /** This denotes that the Trust Center is using a Hashed Link Key. */
    TRUST_CENTER_USES_HASHED_LINK_KEY_ = 132
}
/**
 * The list of supported key types used by Zigbee Security Manager.
 * uint8_t
 */
export declare enum SecManKeyType {
    NONE = 0,
    /**
     * This is the network key, used for encrypting and decrypting network payloads.
     * There is only one of these keys in storage.
     */
    NETWORK = 1,
    /**
     * This is the Trust Center Link Key. On the joining device, this is the APS
     * key used to communicate with the trust center. On the trust center, this
     * key can be used as a root key for APS encryption and decryption when
     * communicating with joining devices (if the security policy has the
     * EMBER_TRUST_CENTER_USES_HASHED_LINK_KEY bit set).
     * There is only one of these keys in storage.
     */
    TC_LINK = 2,
    /**
     * This is a Trust Center Link Key, but it times out after either
     * ::EMBER_TRANSIENT_KEY_TIMEOUT_S or
     * ::EMBER_AF_PLUGIN_NETWORK_CREATOR_SECURITY_NETWORK_OPEN_TIME_S (if
     * defined), whichever is longer. This type of key is set on trust centers
     * who wish to open joining with a temporary, or transient, APS key for
     * devices to join with. Joiners who wish to try several keys when joining a
     * network may set several of these types of keys before attempting to join.
     * This is an indexed key, and local storage can fit as many keys as
     * available RAM allows.
     */
    TC_LINK_WITH_TIMEOUT = 3,
    /**
     * This is an Application link key. On both joining devices and the trust
     * center, this key is used in APS encryption and decryption when
     * communicating to a joining device.
     * This is an indexed key table of size EMBER_KEY_TABLE_SIZE, so long as there
     * is sufficient nonvolatile memory to store keys.
     */
    APP_LINK = 4,
    /** This is the ZLL encryption key for use by algorithms that require it. */
    ZLL_ENCRYPTION_KEY = 5,
    /** For ZLL, this is the pre-configured link key used during classical ZigBee commissioning. */
    ZLL_PRECONFIGURED_KEY = 6,
    /** This is a Green Power Device (GPD) key used on a Proxy device. */
    GREEN_POWER_PROXY_TABLE_KEY = 7,
    /** This is a Green Power Device (GPD) key used on a Sink device. */
    GREEN_POWER_SINK_TABLE_KEY = 8,
    /**
     * This is a generic key type intended to be loaded for one-time hashing or crypto operations.
     * This key is not persisted. Intended for use by the Zigbee stack.
     */
    INTERNAL = 9
}
/**
 * Derived keys are calculated when performing Zigbee crypto operations. The stack makes use of these derivations.
 * Compounding derivations can be specified by using an or-equals on two derived types if applicable;
 * this is limited to performing the key-transport, key-load, or verify-key hashes on either the TC Swap Out or TC Hashed Link keys.
 * uint16_t
 */
export declare enum SecManDerivedKeyType {
    /** Perform no derivation; use the key as is. */
    NONE = 0,
    /** Perform the Key-Transport-Key hash. */
    KEY_TRANSPORT_KEY = 1,
    /** Perform the Key-Load-Key hash. */
    KEY_LOAD_KEY = 2,
    /** Perform the Verify Key hash. */
    VERIFY_KEY = 4,
    /** Perform a simple AES hash of the key for TC backup. */
    TC_SWAP_OUT_KEY = 8,
    /** For a TC using hashed link keys, hashed the root key against the supplied EUI in context. */
    TC_HASHED_LINK_KEY = 16
}
/**
 * Security Manager context flags.
 * uint8_t
 */
export declare enum SecManFlag {
    NONE = 0,
    /**
     * For export APIs, this flag indicates the key_index parameter is valid in
     *  the ::sl_zb_sec_man_context_t structure. This bit is set by the caller
     *  when intending to search for a key by key_index. This flag has no
     *  significance for import APIs. */
    KEY_INDEX_IS_VALID = 1,
    /**
     * For export APIs, this flag indicates the eui64 parameter is valid in the
     *  ::sl_zb_sec_man_context_t structure. This bit is set by the caller when
     *  intending to search for a key by eui64. It is also set when searching by
     *  key_index and an entry is found. This flag has no significance for import
     *  APIs. */
    EUI_IS_VALID = 2,
    /**
     * Internal use only. This indicates that the transient key being added is an
     * unconfirmed, updated key. This bit is set when we add a transient key and
     * the ::EmberTcLinkKeyRequestPolicy policy
     * is ::EMBER_ALLOW_TC_LINK_KEY_REQUEST_AND_GENERATE_NEW_KEY, whose behavior
     * dictates that we generate a new, unconfirmed key, send it to the requester,
     * and await for a Verify Key Confirm message. */
    UNCONFIRMED_TRANSIENT_KEY = 4,
    /**
     * Internal use only.  This indicates that the key being added was derived via
     * dynamic link key negotiation.  This may be used in conjunction with the above
     * ::UNCONFIRMED_TRANSIENT_KEY while the derived link key awaits
     * confirmation
     */
    AUTHENTICATED_DYNAMIC_LINK_KEY = 8,
    /**
     * Internal use only.  This indicates that the "key" being added is instead the
     * symmetric passphrase to be stored in the link key table. This flag will trigger the
     * addition of the KEY_TABLE_SYMMETRIC_PASSPHRASE bitmask when storing the symmetric
     * passphrase so that it can be differentiated from other keys with the same EUI64.
     */
    SYMMETRIC_PASSPHRASE = 16
}
/** This denotes the status of an attempt to establish a key with another device. */
export declare enum EmberKeyStatus {
    STATUS_NONE = 0,
    APP_LINK_KEY_ESTABLISHED = 1,
    TRUST_CENTER_LINK_KEY_ESTABLISHED = 3,
    ESTABLISHMENT_TIMEOUT = 4,
    TABLE_FULL = 5,
    TC_RESPONDED_TO_KEY_REQUEST = 6,
    TC_APP_KEY_SENT_TO_REQUESTER = 7,
    TC_RESPONSE_TO_KEY_REQUEST_FAILED = 8,
    TC_REQUEST_KEY_TYPE_NOT_SUPPORTED = 9,
    TC_NO_LINK_KEY_FOR_REQUESTER = 10,
    TC_REQUESTER_EUI64_UNKNOWN = 11,
    TC_RECEIVED_FIRST_APP_KEY_REQUEST = 12,
    TC_TIMEOUT_WAITING_FOR_SECOND_APP_KEY_REQUEST = 13,
    TC_NON_MATCHING_APP_KEY_REQUEST_RECEIVED = 14,
    TC_FAILED_TO_SEND_APP_KEYS = 15,
    TC_FAILED_TO_STORE_APP_KEY_REQUEST = 16,
    TC_REJECTED_APP_KEY_REQUEST = 17,
    TC_FAILED_TO_GENERATE_NEW_KEY = 18,
    TC_FAILED_TO_SEND_TC_KEY = 19,
    TRUST_CENTER_IS_PRE_R21 = 30,
    TC_REQUESTER_VERIFY_KEY_TIMEOUT = 50,
    TC_REQUESTER_VERIFY_KEY_FAILURE = 51,
    TC_REQUESTER_VERIFY_KEY_SUCCESS = 52,
    VERIFY_LINK_KEY_FAILURE = 100,
    VERIFY_LINK_KEY_SUCCESS = 101
}
/** This bitmask describes the presence of fields within the ::EmberKeyStruct. uint16_t */
export declare enum EmberKeyStructBitmask {
    /** This indicates that the key has a sequence number associated with it. (i.e., a Network Key). */
    HAS_SEQUENCE_NUMBER = 1,
    /** This indicates that the key has an outgoing frame counter and the corresponding value within the ::EmberKeyStruct has been populated.*/
    HAS_OUTGOING_FRAME_COUNTER = 2,
    /** This indicates that the key has an incoming frame counter and the corresponding value within the ::EmberKeyStruct has been populated.*/
    HAS_INCOMING_FRAME_COUNTER = 4,
    /**
     * This indicates that the key has an associated Partner EUI64 address and the corresponding value
     * within the ::EmberKeyStruct has been populated.
     */
    HAS_PARTNER_EUI64 = 8,
    /**
     * This indicates the key is authorized for use in APS data messages.
     * If the key is not authorized for use in APS data messages it has not yet gone through a key agreement protocol, such as CBKE (i.e., ECC).
     */
    IS_AUTHORIZED = 16,
    /**
     * This indicates that the partner associated with the link is a sleepy end device.
     * This bit is set automatically if the local device hears a device announce from the partner indicating it is not an 'RX on when idle' device.
     */
    PARTNER_IS_SLEEPY = 32,
    /**
     * This indicates that the transient key which is being added is unconfirmed.
     * This bit is set when we add a transient key while the EmberTcLinkKeyRequestPolicy is EMBER_ALLOW_TC_LINK_KEY_REQUEST_AND_GENERATE_NEW_KEY
     */
    UNCONFIRMED_TRANSIENT = 64,
    /** This indicates that the actual key data is stored in PSA, and the respective PSA ID is recorded in the psa_id field. */
    HAS_PSA_ID = 128,
    /**
     * This indicates that the keyData field has valid data. On certain parts and depending on the security configuration,
     * keys may live in secure storage and are not exportable. In such cases, keyData will not house the actual key contents.
     */
    HAS_KEY_DATA = 256,
    /**
     * This indicates that the key represents a Device Authentication Token and is not an encryption key.
     * The Authentication token is persisted for the lifetime of the device on the network and used to validate and update the device connection.
     * It is only removed when the device leaves or is decommissioned from the network
     */
    IS_AUTHENTICATION_TOKEN = 512,
    /** This indicates that the key has been derived by the Dynamic Link Key feature. */
    DLK_DERIVED = 1024,
    /** This indicates that the device this key is being used to communicate with supports the APS frame counter synchronization procedure. */
    FC_SYNC_SUPPORTED = 2048
}
/**
 * The Status of the Update Device message sent to the Trust Center.
 * The device may have joined or rejoined insecurely, rejoined securely, or left.
 * MAC Security has been deprecated and therefore there is no secure join.
 * These map to the actual values within the APS Command frame so they cannot be arbitrarily changed.
 * uint8_t
 */
export declare enum EmberDeviceUpdate {
    STANDARD_SECURITY_SECURED_REJOIN = 0,
    STANDARD_SECURITY_UNSECURED_JOIN = 1,
    DEVICE_LEFT = 2,
    STANDARD_SECURITY_UNSECURED_REJOIN = 3
}
/** The decision made by the Trust Center when a node attempts to join. uint8_t */
export declare enum EmberJoinDecision {
    /** Allow the node to join. The node has the key. */
    USE_PRECONFIGURED_KEY = 0,
    /** Allow the node to join. Send the key to the node. */
    SEND_KEY_IN_THE_CLEAR = 1,
    /** Deny join. */
    DENY_JOIN = 2,
    /** Take no action. */
    NO_ACTION = 3,
    /** Allow rejoins only.*/
    ALLOW_REJOINS_ONLY = 4
}
/** A bitmask indicating the state of the ZLL device. This maps directly to the ZLL information field in the scan response. uint16_t */
export declare enum EmberZllState {
    /** No state. */
    NONE = 0,
    /** The device is factory new. */
    FACTORY_NEW = 1,
    /** The device is capable of assigning addresses to other devices. */
    ADDRESS_ASSIGNMENT_CAPABLE = 2,
    /** The device is initiating a link operation. */
    LINK_INITIATOR = 16,
    /** The device is requesting link priority. */
    LINK_PRIORITY_REQUEST = 32,
    /** The device is a ZigBee 3.0 device. */
    PROFILE_INTEROP = 128,
    /** The device is on a non-ZLL network. */
    NON_ZLL_NETWORK = 256,
    /** Internal use: the ZLL token's key values point to a PSA key identifier */
    TOKEN_POINTS_TO_PSA_ID = 512
}
/** Differentiates among ZLL network operations. */
export declare enum EzspZllNetworkOperation {
    /** ZLL form network command. */
    FORM_NETWORK = 0,
    /** ZLL join target command. */
    JOIN_TARGET = 1
}
/** The key encryption algorithms supported by the stack. */
export declare enum EmberZllKeyIndex {
    /** The key encryption algorithm for use during development. */
    DEVELOPMENT = 0,
    /** The key encryption algorithm shared by all certified devices. */
    MASTER = 4,
    /** The key encryption algorithm for use during development and certification. */
    CERTIFICATION = 15
}
/** uint8_t */
export declare enum EmberGpApplicationId {
    /** Source identifier. */
    SOURCE_ID = 0,
    /** IEEE address. */
    IEEE_ADDRESS = 2
}
/** Green Power Security Level. uint8_t */
export declare enum EmberGpSecurityLevel {
    /** No Security  */
    NONE = 0,
    /** Reserved  */
    RESERVED = 1,
    /** 4 Byte Frame Counter and 4 Byte MIC */
    FC_MIC = 2,
    /** 4 Byte Frame Counter and 4 Byte MIC with encryption */
    FC_MIC_ENCRYPTED = 3
}
/** Green Power Security Security Key Type. uint8_t */
export declare enum EmberGpKeyType {
    /** No Key */
    NONE = 0,
    /** GP Security Key Type is Zigbee Network Key */
    NWK = 1,
    /** GP Security Key Type is Group Key */
    GPD_GROUP = 2,
    /** GP Security Key Type is Derived Network Key */
    NWK_DERIVED = 3,
    /** GP Security Key Type is Out Of Box Key */
    GPD_OOB = 4,
    /** GP Security Key Type is GPD Derived Key */
    GPD_DERIVED = 7
}
/** uint8_t */
export declare enum EmberGpProxyTableEntryStatus {
    /** The GP table entry is in use for a Proxy Table Entry. */
    ACTIVE = 1,
    /** The proxy table entry is not in use. */
    UNUSED = 255
}
/** GP Sink Type. */
export declare enum EmberGpSinkType {
    /** Sink Type is Full Unicast */
    FULL_UNICAST = 0,
    /** Sink Type is Derived groupcast, the group ID is derived from the GpdId during commissioning.
     * The sink is added to the APS group with that groupId.
     */
    D_GROUPCAST = 1,
    /** Sink type GROUPCAST, the groupId can be obtained from the APS group table
     * or from the sink table.
     */
    GROUPCAST = 2,
    /** Sink Type is Light Weight Unicast. */
    LW_UNICAST = 3,
    /** Unused sink type */
    UNUSED = 255
}
/** uint8_t */
export declare enum EmberGpSinkTableEntryStatus {
    /** The GP table entry is in use for a Sink Table Entry. */
    ACTIVE = 1,
    /** The proxy table entry is not in use. */
    UNUSED = 255
}
//# sourceMappingURL=enums.d.ts.map
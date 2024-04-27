"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Bytes = exports.fixed_list = exports.WordList = exports.LVList = exports.list = exports.List = exports.LVBytes = exports.uint64_t = exports.uint32_t = exports.uint24_t = exports.uint16_t = exports.uint8_t = exports.uint_t = exports.int64s = exports.int32s = exports.int24s = exports.int16s = exports.int8s = exports.int_t = void 0;
/* istanbul ignore file */
/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
class int_t {
    static _signed = true;
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static serialize(cls, value) {
        const buffer = Buffer.alloc(cls._size, 0);
        if (cls._signed) {
            buffer.writeIntLE(value, 0, cls._size);
        }
        else {
            buffer.writeUIntLE(value, 0, cls._size);
        }
        return buffer;
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static deserialize(cls, data) {
        return [cls._signed ? data.readIntLE(0, cls._size) : data.readUIntLE(0, cls._size), data.subarray(cls._size)];
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static valueToName(cls, value) {
        for (const prop of Object.getOwnPropertyNames(cls)) {
            const desc = Object.getOwnPropertyDescriptor(cls, prop);
            if (desc !== undefined && desc.enumerable && desc.writable && value == desc.value) {
                return `${cls.name}.${prop}`;
            }
        }
        return '';
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static valueName(cls, value) {
        for (const prop of Object.getOwnPropertyNames(cls)) {
            const desc = Object.getOwnPropertyDescriptor(cls, prop);
            if (desc !== undefined && desc.enumerable && desc.writable && value == desc.value) {
                return `${prop}`;
            }
        }
        return '';
    }
}
exports.int_t = int_t;
class int8s extends int_t {
    static _size = 1;
}
exports.int8s = int8s;
class int16s extends int_t {
    static _size = 2;
}
exports.int16s = int16s;
class int24s extends int_t {
    static _size = 3;
}
exports.int24s = int24s;
class int32s extends int_t {
    static _size = 4;
}
exports.int32s = int32s;
class int64s extends int_t {
    static _size = 8;
}
exports.int64s = int64s;
class uint_t extends int_t {
    static _signed = false;
}
exports.uint_t = uint_t;
class uint8_t extends uint_t {
    static _size = 1;
}
exports.uint8_t = uint8_t;
class uint16_t extends uint_t {
    static _size = 2;
}
exports.uint16_t = uint16_t;
class uint24_t extends uint_t {
    static _size = 3;
}
exports.uint24_t = uint24_t;
class uint32_t extends uint_t {
    static _size = 4;
}
exports.uint32_t = uint32_t;
class uint64_t extends uint_t {
    static _size = 8;
}
exports.uint64_t = uint64_t;
class LVBytes {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static serialize(cls, value) {
        if (Buffer.isBuffer(value)) {
            const ret = Buffer.alloc(1);
            ret.writeUInt8(value.length, 0);
            return Buffer.concat([ret, value]);
        }
        return Buffer.from([value.length].concat(value));
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static deserialize(cls, data) {
        const l = data.readIntLE(0, 1);
        const s = data.subarray(1, (l + 1));
        return [s, data.subarray((l + 1))];
    }
}
exports.LVBytes = LVBytes;
class List {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static serialize(cls, value) {
        // console.assert(((cls._length === null) || (cls.length === cls._length)));
        return Buffer.from(value.map(i => i.serialize(cls, i)));
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static deserialize(cls, data) {
        let item;
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
        const r = [];
        while (data) {
            [item, data] = cls.itemtype.deserialize(cls.itemtype, data);
            r.push(item);
        }
        return [r, data];
    }
}
exports.List = List;
class _LVList extends List {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static serialize(cls, value) {
        const head = [cls.length];
        const data = super.serialize(cls, value);
        return Buffer.from(head.concat(data));
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static deserialize(cls, data) {
        let item, length;
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
        const r = [];
        [length, data] = [data[0], data.subarray(1)];
        for (let i = 0; i < length; i++) {
            [item, data] = cls.itemtype.deserialize(cls.itemtype, data);
            r.push(item);
        }
        return [r, data];
    }
}
/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
function list(itemtype) {
    class ConreteList extends List {
        static itemtype = itemtype;
    }
    return ConreteList;
}
exports.list = list;
/* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
function LVList(itemtype) {
    class LVList extends _LVList {
        static itemtype = itemtype;
    }
    return LVList;
}
exports.LVList = LVList;
class WordList extends List {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static serialize(cls, value) {
        const data = value.map(i => Buffer.from(uint16_t.serialize(uint16_t, i)));
        return Buffer.concat(data);
    }
}
exports.WordList = WordList;
class _FixedList extends List {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static serialize(cls, value) {
        const data = value.map(i => cls.itemtype.serialize(cls.itemtype, i)[0]);
        return Buffer.from(data);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static deserialize(cls, data) {
        let item;
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
        const r = [];
        for (let i = 0; i < cls._length; i++) {
            [item, data] = cls.itemtype.deserialize(cls.itemtype, data);
            r.push(item);
        }
        return [r, data];
    }
}
/* eslint-disable @typescript-eslint/no-explicit-any*/
function fixed_list(length, itemtype) {
    class FixedList extends _FixedList {
        static itemtype = itemtype;
        static _length = length;
    }
    return FixedList;
}
exports.fixed_list = fixed_list;
/* eslint-enable @typescript-eslint/no-explicit-any*/
class Bytes {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static serialize(cls, value) {
        return Buffer.from(value);
    }
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any*/
    static deserialize(cls, data) {
        return [data];
    }
}
exports.Bytes = Bytes;
//# sourceMappingURL=basic.js.map
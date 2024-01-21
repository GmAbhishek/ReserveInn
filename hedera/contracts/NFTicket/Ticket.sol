// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

struct Ticket {
  string seatKey;
  int256 price;
  address buyer;
  bool scanned;
}

struct TicketMap {
  int64[] keys;
  mapping(int64 => Ticket) values;
  mapping(int64 => uint256) indexOf;
  mapping(int64 => bool) inserted;
}

library TicketIterableMapping {
  function exists(TicketMap storage self, int64 key) internal view returns (bool) {
    return self.inserted[key];
  }

  function get(TicketMap storage self, int64 key) internal view returns (Ticket storage) {
    return self.values[key];
  }

  function getKeyAtIndex(TicketMap storage self, uint256 index) internal view returns (int64) {
    return self.keys[index];
  }

  function size(TicketMap storage self) internal view returns (uint256) {
    return self.keys.length;
  }

  function set(TicketMap storage self, int64 key, Ticket memory val) internal {
    if (self.inserted[key]) {
      self.values[key] = val;
    } else {
      self.inserted[key] = true;
      self.values[key] = val;
      self.indexOf[key] = self.keys.length;
      self.keys.push(key);
    }
  }

  function remove(TicketMap storage self, int64 key) internal {
    if (!self.inserted[key]) {
      return;
    }

    delete self.inserted[key];
    delete self.values[key];

    uint index = self.indexOf[key];
    int64 lastKey = self.keys[self.keys.length - 1];

    self.indexOf[lastKey] = index;
    delete self.indexOf[key];

    self.keys[index] = lastKey;
    self.keys.pop();
  }
}

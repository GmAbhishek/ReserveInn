// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

struct Section {
  int256 ticketPrice;
  int256 maxCapacity;
  int256 remainingCapacity;
}

struct SectionMap {
  string[] keys;
  mapping(string => Section) values;
  mapping(string => uint256) indexOf;
  mapping(string => bool) inserted;
}

library SectionIterableMapping {
  function exists(SectionMap storage self, string memory key) internal view returns (bool) {
    return self.inserted[key];
  }

  function get(SectionMap storage self, string memory key) internal view returns (Section storage) {
    return self.values[key];
  }

  function getKeyAtIndex(SectionMap storage self, uint256 index) internal view returns (string storage) {
    return self.keys[index];
  }

  function size(SectionMap storage self) internal view returns (uint256) {
    return self.keys.length;
  }

  function set(SectionMap storage self, string memory key, Section memory val) internal {
    if (self.inserted[key]) {
      self.values[key] = val;
    } else {
      self.inserted[key] = true;
      self.values[key] = val;
      self.indexOf[key] = self.keys.length;
      self.keys.push(key);
    }
  }

  function remove(SectionMap storage self, string memory key) internal {
    if (!self.inserted[key]) {
      return;
    }

    delete self.inserted[key];
    delete self.values[key];

    uint index = self.indexOf[key];
    string memory lastKey = self.keys[self.keys.length - 1];

    self.indexOf[lastKey] = index;
    delete self.indexOf[key];

    self.keys[index] = lastKey;
    self.keys.pop();
  }
}

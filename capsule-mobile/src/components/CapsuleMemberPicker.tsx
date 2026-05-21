import { FlatList, Text, TouchableOpacity, View } from "react-native";

export type VerifiedFriendProfile = {
  id: string;
  username: string;
  email: string;
};

export type CapsuleMemberPickerProps = {
  friends: VerifiedFriendProfile[];
  selectedFriendIds: string[];
  onSelectionChange: (selectedFriendIds: string[]) => void;
  emptyMessage?: string;
};

export function CapsuleMemberPicker({
  friends,
  selectedFriendIds,
  onSelectionChange,
  emptyMessage = "No verified friends yet.",
}: CapsuleMemberPickerProps) {
  const toggleFriend = (friendId: string) => {
    const isSelected = selectedFriendIds.includes(friendId);
    const nextSelectedFriendIds = isSelected
      ? selectedFriendIds.filter((selectedId) => selectedId !== friendId)
      : [...selectedFriendIds, friendId];

    onSelectionChange(nextSelectedFriendIds);
  };

  return (
    <View className="rounded-2xl border border-slate-800 bg-slate-950 p-3">
      <FlatList
        data={friends}
        extraData={selectedFriendIds}
        initialNumToRender={12}
        keyExtractor={(friend) => friend.id}
        maxToRenderPerBatch={12}
        removeClippedSubviews
        scrollEnabled={false}
        windowSize={5}
        ItemSeparatorComponent={() => <View className="h-3" />}
        ListEmptyComponent={
          <View className="items-center justify-center rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 px-4 py-8">
            <Text className="text-center text-sm text-slate-500">{emptyMessage}</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isSelected = selectedFriendIds.includes(item.id);

          return (
            <TouchableOpacity
              activeOpacity={0.78}
              className={`min-h-16 flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                isSelected ? "border-indigo-400 bg-indigo-950/70" : "border-slate-800 bg-slate-900/70"
              }`}
              onPress={() => toggleFriend(item.id)}
            >
              <View className="flex-1 pr-4">
                <Text className="text-base font-semibold text-slate-50" numberOfLines={1}>
                  {item.username}
                </Text>
                <Text className="mt-1 text-xs text-slate-400" numberOfLines={1}>
                  {item.email}
                </Text>
              </View>

              <View
                className={`h-7 w-7 items-center justify-center rounded-full border ${
                  isSelected ? "border-indigo-300 bg-indigo-500" : "border-slate-700 bg-slate-950"
                }`}
              >
                <Text className={`text-sm font-bold ${isSelected ? "text-white" : "text-slate-600"}`}>
                  {isSelected ? "*" : ""}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

export default CapsuleMemberPicker;

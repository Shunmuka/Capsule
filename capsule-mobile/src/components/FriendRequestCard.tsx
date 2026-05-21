import { Text, TouchableOpacity, View } from "react-native";

export type FriendRequestAction = "ACCEPT" | "DECLINE";

export type FriendRequestSender = {
  id: string;
  username: string;
  email?: string;
};

export type FriendRequest = {
  id: string;
  sender: FriendRequestSender;
};

export type FriendRequestCardProps = {
  request: FriendRequest;
  onRespond: (requestId: string, action: FriendRequestAction) => void;
  disabled?: boolean;
};

export function FriendRequestCard({ request, onRespond, disabled = false }: FriendRequestCardProps) {
  const handleAccept = () => {
    onRespond(request.id, "ACCEPT");
  };

  const handleIgnore = () => {
    onRespond(request.id, "DECLINE");
  };

  return (
    <View className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <View className="mb-4">
        <Text className="text-[10px] font-semibold uppercase tracking-[3px] text-slate-500">Friend Request</Text>
        <Text className="mt-2 text-lg font-semibold text-slate-50" numberOfLines={1}>
          {request.sender.username}
        </Text>
        {request.sender.email ? (
          <Text className="mt-1 text-sm text-slate-400" numberOfLines={1}>
            {request.sender.email}
          </Text>
        ) : null}
      </View>

      <View className="flex-row gap-3">
        <TouchableOpacity
          activeOpacity={0.78}
          className={`h-12 flex-1 items-center justify-center rounded-2xl bg-indigo-500 ${
            disabled ? "opacity-50" : "active:bg-indigo-400"
          }`}
          disabled={disabled}
          onPress={handleAccept}
        >
          <Text className="text-sm font-bold uppercase tracking-[2px] text-white">Accept</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.78}
          className={`h-12 flex-1 items-center justify-center rounded-2xl border border-slate-700 bg-slate-900 ${
            disabled ? "opacity-50" : "active:bg-slate-800"
          }`}
          disabled={disabled}
          onPress={handleIgnore}
        >
          <Text className="text-sm font-bold uppercase tracking-[2px] text-slate-300">Ignore</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default FriendRequestCard;

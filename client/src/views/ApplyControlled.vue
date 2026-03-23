<template>
  <div class="apply-page">
    <van-nav-bar title="管控物品领用申请" left-arrow @click-left="$router.back()" />

    <van-form @submit="onSubmit" class="apply-form">
      <van-cell-group inset>
        <van-field
          v-model="form.itemName"
          name="itemName"
          label="物品名称"
          placeholder="请输入物品名称"
          :rules="[{ required: true, message: '请输入物品名称' }]"
        />
        <van-field
          v-model="form.quantity"
          name="quantity"
          label="数量"
          type="digit"
          placeholder="请输入数量"
          :rules="[{ required: true, message: '请输入数量' }]"
        />
        <van-field
          v-model="form.purpose"
          name="purpose"
          label="用途"
          type="textarea"
          rows="3"
          placeholder="请描述领用用途"
          :rules="[{ required: true, message: '请描述领用用途' }]"
        />
        <van-field
          v-model="form.returnDate"
          is-link
          readonly
          name="returnDate"
          label="预计归还"
          placeholder="请选择归还日期"
          :rules="[{ required: true, message: '请选择归还日期' }]"
          @click="showDatePicker = true"
        />
      </van-cell-group>

      <div class="submit-area">
        <van-button round block type="primary" native-type="submit" :loading="submitting">
          提交领用申请
        </van-button>
      </div>
    </van-form>

    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        :min-date="minDate"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <!-- 提交成功弹窗 -->
    <van-dialog
      v-model:show="showSuccess"
      title="申请已提交"
      :show-cancel-button="false"
      confirm-button-text="知道了"
      @confirm="$router.back()"
    >
      <div class="success-content">
        <p>您的领用申请已提交至飞书审批流。</p>
        <p>审批通过后将自动更新物品状态。</p>
        <p class="instance-code" v-if="instanceCode">
          审批单号：{{ instanceCode }}
        </p>
      </div>
    </van-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRoute } from 'vue-router';
import { showToast } from 'vant';
import http from '@/services/api';

const route = useRoute();

const form = reactive({
  itemName: (route.query.itemName as string) || '',
  quantity: '',
  purpose: '',
  returnDate: '',
});

const showDatePicker = ref(false);
const submitting = ref(false);
const showSuccess = ref(false);
const instanceCode = ref('');
const minDate = new Date();

function onDateConfirm({ selectedValues }: { selectedValues: string[] }) {
  form.returnDate = selectedValues.join('-');
  showDatePicker.value = false;
}

async function onSubmit() {
  submitting.value = true;
  try {
    const { data } = await http.post('/approval/apply', {
      itemId: route.query.itemId || '',
      itemName: form.itemName,
      quantity: Number(form.quantity),
      purpose: form.purpose,
      returnDate: form.returnDate,
    });
    instanceCode.value = data.instanceCode;
    showSuccess.value = true;
  } catch (err) {
    showToast(err instanceof Error ? err.message : '提交失败');
  } finally {
    submitting.value = false;
  }
}
</script>

<style scoped>
.apply-form {
  padding-top: 16px;
}

.submit-area {
  margin: 24px 16px;
}

.success-content {
  padding: 16px 24px;
  text-align: center;
  color: #666;
  font-size: 14px;
}

.instance-code {
  margin-top: 12px;
  color: #999;
  font-size: 12px;
}
</style>

<template id="n-confirm">
	<div class="is-confirm">
		<h2 class="is-confirm-title is-h2" v-if="title" v-html="title"></h2>
		<div class="is-confirm-content">
			<div v-if="type" class="is-confirm-icon"><icon :name="getIcon()"/></div>
			<div class="is-confirm-message" v-html="message"></div>
		</div>
		<div class="is-confirm-buttons">
			<button class="is-confirm-button-cancel" v-if="rejectable" @click="$reject()" v-html="cancel ? cancel : translate('%{confirm::Cancel}')"></button>
			<button class="is-confirm-button-ok" @click="resolve()" v-focus v-html="ok ? ok : translate('%{confirm::Ok}')"></button>
		</div>
	</div>
</template>

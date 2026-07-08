export enum CardType {
  Leader = 'LEADER',
  Character = 'CHARACTER',
  Event = 'EVENT',
  Stage = 'STAGE',
  Don = 'DON',
}

export enum CardColor {
  Red = 'RED',
  Green = 'GREEN',
  Blue = 'BLUE',
  Purple = 'PURPLE',
  Black = 'BLACK',
  Yellow = 'YELLOW',
}

export enum CardRarity {
  Leader = 'LEADER',
  Common = 'COMMON',
  Uncommon = 'UNCOMMON',
  Rare = 'RARE',
  SuperRare = 'SUPER_RARE',
  SecretRare = 'SECRET_RARE',
  Promo = 'PROMO',
}

export interface Card {
  id: string
  code: string
  name: string
  type: CardType
  colors: CardColor[]
  rarity: CardRarity
  cost?: number
  power?: number
  counter?: number
  life?: number
  attribute?: string
  text?: string
  tags: string[]
  isPlaceholder?: boolean
}
